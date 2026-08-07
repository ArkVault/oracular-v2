import * as React from 'react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-day-picker/dist/style.css';

import { appConfig } from '@/app/config';
import { appServices, type AppServices } from '@/app/services';
import { ParameterLoader } from '@/components/UI/ParameterLoader';
import type { PlaceSearchResult } from '@/features/place-search/domain/place';

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

import '../UI/parameter-loader.css';
import './loader.css';
import './map-ui.css';

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  services?: AppServices;
}

export function Map({
  center = [20.27, -103.2],
  zoom = 12,
  services = appServices,
}: MapProps) {
  const mapRef = React.useRef<L.Map | null>(null);
  const [isIndicatorPanelVisible, setIsIndicatorPanelVisible] = React.useState(true);
  const [isDetailVisible, setIsDetailVisible] = React.useState(true);
  const [selectedIndicator, setSelectedIndicator] = React.useState<IndicatorDefinition>(
    INDICATORS[0],
  );
  const [selectedLayer, setSelectedLayer] = React.useState('');
  const [isIndicatorLoading, setIsIndicatorLoading] = React.useState(false);
  const [drawMode, setDrawMode] = React.useState<DrawMode>(null);
  const [drawingToolsActivated, setDrawingToolsActivated] = React.useState(false);
  const [clearDrawingsSignal, setClearDrawingsSignal] = React.useState(0);

  const acquisitions = useAcquisitionDates({
    center,
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

  const handleIndicatorSelect = async (indicator: IndicatorDefinition) => {
    setIsIndicatorLoading(true);
    setSelectedIndicator(indicator);
    setIsDetailVisible(true);
    pointAnalysis.clear();

    await new Promise((resolve) =>
      setTimeout(resolve, appConfig.indicatorLoadingDelayMs),
    );

    setSelectedLayer(indicator.type === 'natural' ? '' : indicator.layer || '');
    setIsIndicatorLoading(false);
  };

  const handleLocationSelect = (result: PlaceSearchResult) => {
    mapRef.current?.setView([result.latitude, result.longitude], 12);
    placeSearch.clear();
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
    <div className={`map-shell ${pointAnalysis.pointInfo ? 'has-analysis-result' : ''}`}>
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
          onSelectDate: acquisitions.setSelectedDate,
          selectedCalendarDate: acquisitions.selectedCalendarDate,
        }}
        placeSearch={{
          isSearching: placeSearch.isSearching,
          onClear: placeSearch.clear,
          onSearch: placeSearch.search,
          onSelect: handleLocationSelect,
          query: placeSearch.query,
          results: placeSearch.results,
        }}
      />

      <MapCanvas
        center={center}
        clearDrawingsSignal={clearDrawingsSignal}
        drawMode={drawMode}
        drawingToolsActivated={drawingToolsActivated}
        mapRef={mapRef}
        onDrawingComplete={() => setDrawMode(null)}
        onSaveKml={handleSaveKml}
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

      {isDetailVisible && (
        <AnalysisDetailsPanel
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
