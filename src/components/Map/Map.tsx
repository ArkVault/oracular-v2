import * as React from 'react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-day-picker/dist/style.css';

import { appConfig } from '@/app/config';
import { appServices, type AppServices } from '@/app/services';
import { ParameterLoader } from '@/components/UI/ParameterLoader';
import type { PlaceSearchResult } from '@/features/place-search/domain/place';
import { useI18n } from '@/i18n/i18n';

import { AnalysisDetailsPanel } from './AnalysisDetailsPanel';
import { useAcquisitionDates } from './hooks/use-acquisition-dates';
import { usePlaceSearch } from './hooks/use-place-search';
import { usePointAnalysis } from './hooks/use-point-analysis';
import { IndicatorPanel } from './IndicatorPanel';
import { INDICATORS, type IndicatorDefinition } from './indicator-definitions';
import { MapCanvas } from './MapCanvas';
import { MapControls } from './MapControls';
import { MapHeader } from './MapHeader';
import type { DrawMode } from './map-types';
import { WorkflowGuide, type WorkflowGuideStep } from './WorkflowGuide';

import '../UI/parameter-loader.css';
import './loader.css';
import './map-ui.css';

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  services?: AppServices;
}

const WORKFLOW_GUIDE_PREFERENCE_KEY = 'oracular.workflow-guide';
const MAP_TYPOGRAPHY_STYLE = {
  '--oracular-font-body': '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  '--oracular-font-title': '"Figtree", ui-sans-serif, system-ui, sans-serif',
} as React.CSSProperties;

function isWorkflowGuideInitiallyEnabled() {
  try {
    return globalThis.localStorage?.getItem(WORKFLOW_GUIDE_PREFERENCE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function saveWorkflowGuidePreference(enabled: boolean) {
  try {
    if (enabled) {
      globalThis.localStorage?.removeItem(WORKFLOW_GUIDE_PREFERENCE_KEY);
    } else {
      globalThis.localStorage?.setItem(WORKFLOW_GUIDE_PREFERENCE_KEY, 'off');
    }
  } catch {
    // Keep the in-memory preference when storage is unavailable.
  }
}

export function Map({
  center = [18.64592, -91.82991],
  zoom = 10,
  services = appServices,
}: MapProps) {
  const { locale, t } = useI18n();
  const mapRef = React.useRef<L.Map | null>(null);
  const analysisAccessAbortRef = React.useRef<AbortController | undefined>(undefined);
  const indicatorLoadTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [isIndicatorPanelVisible, setIsIndicatorPanelVisible] = React.useState(true);
  const [isDetailVisible, setIsDetailVisible] = React.useState(true);
  const [selectedIndicator, setSelectedIndicator] = React.useState<IndicatorDefinition>(
    INDICATORS[0],
  );
  const [selectedLayer, setSelectedLayer] = React.useState('');
  const [isIndicatorLoading, setIsIndicatorLoading] = React.useState(false);
  const [analysisAccessMessage, setAnalysisAccessMessage] = React.useState<string>();
  const [drawMode, setDrawMode] = React.useState<DrawMode>(null);
  const [drawingToolsActivated, setDrawingToolsActivated] = React.useState(false);
  const [clearDrawingsSignal, setClearDrawingsSignal] = React.useState(0);
  const [isWorkflowGuideEnabled, setIsWorkflowGuideEnabled] = React.useState(
    isWorkflowGuideInitiallyEnabled,
  );
  const [workflowGuideStep, setWorkflowGuideStep] = React.useState<WorkflowGuideStep>('search');
  const [openDatePickerSignal, setOpenDatePickerSignal] = React.useState(0);
  const [openSearchSignal, setOpenSearchSignal] = React.useState(0);

  const acquisitions = useAcquisitionDates({
    center,
    collection: selectedIndicator.acquisitionCollection ?? 'sentinel-2',
    mapRef,
    provider: services.acquisitionDates,
  });
  const placeSearch = usePlaceSearch(services.placeSearch);
  const pointAnalysis = usePointAnalysis({
    mapRef,
    provider: services.featureInfo,
    selectedAcquisitionDate: acquisitions.selectedDate,
    selectedIndicator,
    selectedLayer,
  });

  React.useEffect(() => () => {
    if (indicatorLoadTimeoutRef.current) {
      clearTimeout(indicatorLoadTimeoutRef.current);
    }
    analysisAccessAbortRef.current?.abort();
  }, []);

  const handleIndicatorSelect = (indicator: IndicatorDefinition) => {
    const shouldAdvanceWorkflow = isWorkflowGuideEnabled
      && workflowGuideStep === 'indicators';

    if (indicatorLoadTimeoutRef.current) {
      clearTimeout(indicatorLoadTimeoutRef.current);
    }
    analysisAccessAbortRef.current?.abort();
    analysisAccessAbortRef.current = undefined;

    // Unmount the active WMS layer immediately so superseded network work cannot
    // remain visible or be paired with the newly selected indicator config.
    setSelectedLayer('');
    setIsIndicatorLoading(true);
    setAnalysisAccessMessage(undefined);
    setSelectedIndicator(indicator);
    setIsDetailVisible(true);
    pointAnalysis.clear();

    indicatorLoadTimeoutRef.current = setTimeout(() => {
      indicatorLoadTimeoutRef.current = undefined;
      if (indicator.type === 'natural') {
        setIsIndicatorLoading(false);
        if (shouldAdvanceWorkflow) setWorkflowGuideStep('ready');
        return;
      }

      const controller = new AbortController();
      analysisAccessAbortRef.current = controller;
      void services.analysisAccess.consume(indicator.name, controller.signal)
        .then(() => {
          if (controller.signal.aborted) return;
          setSelectedLayer(indicator.layer || '');
          if (shouldAdvanceWorkflow) setWorkflowGuideStep('ready');
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setIsIndicatorLoading(false);
          setSelectedIndicator(INDICATORS[0]);
          const resetAt = getAnalysisLimitResetAt(error);
          setAnalysisAccessMessage(resetAt
            ? t('limit.reached', { time: formatAnalysisResetAt(resetAt, locale) })
            : t('limit.unavailable'));
        })
        .finally(() => {
          if (analysisAccessAbortRef.current === controller) {
            analysisAccessAbortRef.current = undefined;
          }
        });
    }, appConfig.indicatorLoadingDelayMs);
  };

  const handleLocationSelect = (result: PlaceSearchResult) => {
    mapRef.current?.setView([result.latitude, result.longitude], 12);
    placeSearch.clear();
    if (isWorkflowGuideEnabled && workflowGuideStep === 'search') {
      setWorkflowGuideStep('dates');
    }
  };

  const handleWorkflowGuideToggle = () => {
    setIsWorkflowGuideEnabled((enabled) => {
      if (!enabled) setWorkflowGuideStep('search');
      saveWorkflowGuidePreference(!enabled);
      return !enabled;
    });
  };

  const dismissWorkflowGuide = () => {
    setIsWorkflowGuideEnabled(false);
    saveWorkflowGuidePreference(false);
  };

  const handleSaveKml = React.useCallback((kml: string) => {
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'area-selection.kml';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }, []);

  const toggleDrawMode = (mode: Exclude<DrawMode, null>) => {
    setDrawingToolsActivated(true);
    setDrawMode((current) => (current === mode ? null : mode));
  };

  const clearDrawings = () => {
    setDrawingToolsActivated(true);
    setClearDrawingsSignal((signal) => signal + 1);
  };

  return (
    <div
      className={[
        'map-shell',
        pointAnalysis.pointInfo ? 'has-analysis-result' : '',
        isWorkflowGuideEnabled ? 'has-workflow-guide' : '',
        isWorkflowGuideEnabled ? `workflow-step-${workflowGuideStep}` : '',
      ].filter(Boolean).join(' ')}
      style={MAP_TYPOGRAPHY_STYLE}
    >
      <MapHeader
        acquisitions={{
          availableCalendarDates: acquisitions.availableCalendarDates,
          availableDateSet: acquisitions.availableDateSet,
          availableDates: acquisitions.availableDates,
          calendarMonth: acquisitions.calendarMonth,
          error: acquisitions.error,
          isLoading: acquisitions.isLoading,
          onLoad: acquisitions.load,
          onMonthChange: acquisitions.setCalendarMonth,
          onSelectDate: (date) => {
            acquisitions.setSelectedDate(date);
            if (date && isWorkflowGuideEnabled && workflowGuideStep === 'dates') {
              setWorkflowGuideStep('indicators');
            }
          },
          selectedCalendarDate: acquisitions.selectedCalendarDate,
        }}
        openDatePickerSignal={openDatePickerSignal}
        openSearchSignal={openSearchSignal}
        placeSearch={{
          isSearching: placeSearch.isSearching,
          onClear: placeSearch.clear,
          onSearch: placeSearch.search,
          onSelect: handleLocationSelect,
          query: placeSearch.query,
          results: placeSearch.results,
        }}
        workflowGuide={{
          enabled: isWorkflowGuideEnabled,
          onToggle: handleWorkflowGuideToggle,
        }}
      />

      {analysisAccessMessage && (
        <div className="oracular-analysis-limit-alert" role="alert">
          {analysisAccessMessage}
        </div>
      )}

      <MapCanvas
        center={center}
        clearDrawingsSignal={clearDrawingsSignal}
        drawMode={drawMode}
        drawingToolsActivated={drawingToolsActivated}
        mapRef={mapRef}
        onDrawingComplete={() => setDrawMode(null)}
        onSaveKml={handleSaveKml}
        onWmsLoadingChange={setIsIndicatorLoading}
        selectedAcquisitionDate={acquisitions.selectedDate}
        selectedIndicator={selectedIndicator}
        selectedLayer={selectedLayer}
        selectedTileTime={acquisitions.selectedTileTime}
        zoom={zoom}
      />

      <MapControls
        drawMode={drawMode}
        onClearDrawings={clearDrawings}
        onResetView={() => mapRef.current?.setView(center, zoom)}
        onToggleDrawMode={toggleDrawMode}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
      />

      <IndicatorPanel
        isVisible={isIndicatorPanelVisible}
        onSelect={handleIndicatorSelect}
        onToggle={() => setIsIndicatorPanelVisible((visible) => !visible)}
        selectedIndicator={selectedIndicator}
      />

      {isWorkflowGuideEnabled && (
        <WorkflowGuide
          step={workflowGuideStep}
          onBack={() => setWorkflowGuideStep(
            workflowGuideStep === 'ready'
              ? 'indicators'
              : workflowGuideStep === 'indicators'
                ? 'dates'
                : 'search',
          )}
          onComplete={dismissWorkflowGuide}
          onDismiss={dismissWorkflowGuide}
          onOpenDates={() => setOpenDatePickerSignal((signal) => signal + 1)}
          onOpenSearch={() => setOpenSearchSignal((signal) => signal + 1)}
        />
      )}

      {isDetailVisible && (
        <AnalysisDetailsPanel
          acquiredAt={acquisitions.selectedAcquisition?.acquiredAt}
          indicator={selectedIndicator}
          onClearPoint={pointAnalysis.clear}
          onClose={() => setIsDetailVisible(false)}
          pointInfo={pointAnalysis.pointInfo}
        />
      )}

      <ParameterLoader isVisible={isIndicatorLoading || pointAnalysis.isLoading} />
    </div>
  );
}

function getAnalysisLimitResetAt(error: unknown): string | undefined {
  if (
    error instanceof Error
    && error.name === 'AnalysisLimitExceededError'
    && 'resetAt' in error
    && typeof error.resetAt === 'string'
  ) {
    return error.resetAt;
  }
  return undefined;
}

function formatAnalysisResetAt(resetAt: string, locale: string): string {
  if (locale === 'en-US') {
    const timestamp = new Date(resetAt);
    const day = String(timestamp.getUTCDate()).padStart(2, '0');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][timestamp.getUTCMonth()];
    return `${day} ${month} ${timestamp.getUTCFullYear()} · ${timestamp.toISOString().slice(11, 16)} UTC`;
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', hour: '2-digit', hour12: false, minute: '2-digit',
    month: 'short', timeZone: 'UTC', timeZoneName: 'short', year: 'numeric',
  }).format(new Date(resetAt));
}
