import React from 'react';
import { MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import {
  Activity,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  Pencil,
  Search,
  Square,
  Trash2,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { DrawControl } from './DrawControl';
import { PointInfoSection, type PointInfoData } from './PointInfoSection';
import type L from 'leaflet';

// Add this CSS near the top of your file, after the other imports
import './leaflet-draw-override.css';
import './map-ui.css';

import { ParameterLoader } from '../UI/ParameterLoader';
import { Button } from '@/components/UI/button';
import { Card } from '@/components/UI/card';
import '../UI/parameter-loader.css';
import './loader.css';
import {
  classifyWaterQuality,
} from '../../features/analysis/domain/quality';
import {
  createMeasurementGradient,
  getMeasurementScale,
} from '../../features/analysis/domain/measurement-scale';
import { appConfig } from '@/app/config';
import { appServices, type AppServices } from '@/app/services';
import {
  acquisitionDateToLocalDate,
  localDateToAcquisitionDate,
  toWmsDayTimeRange,
} from '@/features/acquisitions/domain/acquisition-date';
import { DEFAULT_MAX_CLOUD_COVERAGE } from '../../features/acquisitions/domain/cloud-coverage';
import type { PlaceSearchResult } from '@/features/place-search/domain/place';
import {
  INDICATORS,
  type IndicatorDefinition,
} from './indicator-definitions';
import { createFeatureInfoViewport } from './create-feature-info-viewport';

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  services?: AppServices;
}

export function Map({
  center = [20.2700, -103.2000],
  zoom = 12,
  services = appServices,
}: MapProps) {
  const [isPanelVisible, setIsPanelVisible] = React.useState(true);
  const [isDetailVisible, setIsDetailVisible] = React.useState(true);
  const [selectedIndicator, setSelectedIndicator] = React.useState<IndicatorDefinition>(INDICATORS[0]);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showSensorMenu, setShowSensorMenu] = React.useState(false);
  const [selectedAcquisitionDate, setSelectedAcquisitionDate] = React.useState<string>();
  const [availableAcquisitionDates, setAvailableAcquisitionDates] = React.useState<string[]>([]);
  const [isLoadingAcquisitionDates, setIsLoadingAcquisitionDates] = React.useState(false);
  const [acquisitionDatesError, setAcquisitionDatesError] = React.useState<string>();
  const [calendarMonth, setCalendarMonth] = React.useState(new Date());
  const [drawMode, setDrawMode] = React.useState<'polygon' | 'rectangle' | null>(null);
  const [clearDrawingsSignal, setClearDrawingsSignal] = React.useState(0);
  const [selectedLayer, setSelectedLayer] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const mapRef = React.useRef<L.Map | null>(null);
  const [pixelInfo, setPixelInfo] = React.useState<PointInfoData | null>(null);
  const availableAcquisitionDateSet = React.useMemo(
    () => new Set(availableAcquisitionDates),
    [availableAcquisitionDates],
  );
  const availableCalendarDates = React.useMemo(
    () => availableAcquisitionDates.map(acquisitionDateToLocalDate),
    [availableAcquisitionDates],
  );
  const selectedCalendarDate = selectedAcquisitionDate
    ? acquisitionDateToLocalDate(selectedAcquisitionDate)
    : undefined;
  const selectedTileTime = selectedAcquisitionDate
    ? toWmsDayTimeRange(selectedAcquisitionDate)
    : undefined;
  const selectedMeasurementScale =
    selectedIndicator.type === 'natural' || selectedIndicator.type === 'discrete'
      ? undefined
      : getMeasurementScale(selectedIndicator.layer);

  const loadAcquisitionDates = React.useCallback(async () => {
    const bounds = mapRef.current?.getBounds();
    const to = new Date();
    const from = new Date(to);
    from.setUTCFullYear(to.getUTCFullYear() - 1);

    setIsLoadingAcquisitionDates(true);
    setAcquisitionDatesError(undefined);
    try {
      const acquisitions = await services.acquisitionDates.list({
        bounds: bounds
          ? {
              south: bounds.getSouth(),
              west: bounds.getWest(),
              north: bounds.getNorth(),
              east: bounds.getEast(),
            }
          : {
              south: center[0] - 0.15,
              west: center[1] - 0.15,
              north: center[0] + 0.15,
              east: center[1] + 0.15,
            },
        from,
        to,
        maxCloudCoverage: DEFAULT_MAX_CLOUD_COVERAGE,
      });
      const dates = acquisitions.map((acquisition) => acquisition.date);
      setAvailableAcquisitionDates(dates);
      if (dates[0]) {
        setCalendarMonth(acquisitionDateToLocalDate(dates[0]));
      }
      setSelectedAcquisitionDate((current) =>
        current && dates.includes(current) ? current : undefined,
      );
    } catch (error) {
      console.error('Error fetching Copernicus acquisition dates:', error);
      setAvailableAcquisitionDates([]);
      setAcquisitionDatesError('Unable to load Copernicus dates for this area.');
    } finally {
      setIsLoadingAcquisitionDates(false);
    }
  }, [center, services.acquisitionDates]);

  const toggleDatePicker = () => {
    const nextVisible = !showDatePicker;
    setShowDatePicker(nextVisible);
    if (nextVisible) {
      void loadAcquisitionDates();
    }
    setShowSensorMenu(false);
    setShowSearch(false);
  };

  const toggleSensorMenu = () => {
    setShowSensorMenu((visible) => !visible);
    setShowDatePicker(false);
    setShowSearch(false);
  };

  const toggleSearch = () => {
    setShowSearch((visible) => !visible);
    setShowDatePicker(false);
    setShowSensorMenu(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.date-picker-container') && !target.closest('.date-button')) {
      setShowDatePicker(false);
    }
    if (!target.closest('.sensor-menu-container') && !target.closest('.sensor-button')) {
      setShowSensorMenu(false);
    }
  };

  const handleSaveKML = React.useCallback((kml: string) => {
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'area-selection.kml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, []);

  const handleDrawingComplete = React.useCallback(() => {
    setDrawMode(null);
  }, []);

  const handleIndicatorSelect = async (indicator: IndicatorDefinition) => {
    setIsLoading(true);
    setSelectedIndicator(indicator);
    setIsDetailVisible(true);
    setPixelInfo(null);

    await new Promise(resolve => setTimeout(resolve, appConfig.indicatorLoadingDelayMs));

    if (indicator.type !== 'natural') {
      setSelectedLayer(indicator.layer || '');
    } else {
      setSelectedLayer('');
    }
    setIsLoading(false);
  };

  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      setSearchResults(await services.placeSearch.search(query));
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const handleLocationSelect = (result: PlaceSearchResult) => {
    if (mapRef.current) {
      mapRef.current.setView([result.latitude, result.longitude], 12);
    }
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add click handler function
  const handleMapClick = React.useCallback(async (e: L.LeafletMouseEvent) => {
    if (selectedIndicator?.type === 'natural') {
      setPixelInfo({
        value: null,
        quality: 'Unknown',
        coordinates: [e.latlng.lat, e.latlng.lng],
        message: 'Please select a water quality parameter to view point values'
      });
      return;
    }

    if (!selectedLayer) {
      setPixelInfo(null);
      return;
    }

    setIsLoading(true);
    try {
      const timeRange = selectedAcquisitionDate
        ? {
            from: new Date(`${selectedAcquisitionDate}T00:00:00.000Z`),
            to: new Date(`${selectedAcquisitionDate}T23:59:59.999Z`),
          }
        : undefined;
      const viewport = mapRef.current
        ? createFeatureInfoViewport(mapRef.current, e)
        : undefined;

      const result = await services.featureInfo.get({
        layer: selectedLayer,
        point: { lat: e.latlng.lat, lng: e.latlng.lng },
        ...(viewport ? { viewport } : {}),
        maxCloudCoverage: 10,
        ...(timeRange ? { timeRange } : {}),
      });

      setPixelInfo({
        value: result.value,
        ...(result.valueSource ? { valueSource: result.valueSource } : {}),
        ...(result.isOutOfArea ? { isOutOfArea: true } : {}),
        quality:
          result.value === null
            ? 'Unknown'
            : classifyWaterQuality(result.value, selectedLayer),
        coordinates: [e.latlng.lat, e.latlng.lng],
        ...(result.message ? { message: result.message } : {}),
        ...(result.acquisitionId ? { acquisitionId: result.acquisitionId } : {}),
        ...(result.acquisitionDate ? { acquisitionDate: result.acquisitionDate } : {}),
        ...(result.cloudCoverage !== undefined
          ? { cloudCoverage: result.cloudCoverage }
          : {}),
      });
    } catch (error) {
      console.error('Error fetching pixel info:', error);
      setPixelInfo({
        value: null,
        quality: 'Unknown',
        coordinates: [e.latlng.lat, e.latlng.lng],
        message: 'Unable to load a real Copernicus value for this point.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcquisitionDate, selectedIndicator, selectedLayer, services.featureInfo]);

  // Add this effect to handle map click events
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [handleMapClick]);

  return (
    <div className={`map-shell ${pixelInfo ? 'has-analysis-result' : ''}`}>
      <nav className="orber-header" aria-label="Primary navigation">
        <div className="orber-brand">
          <div className="orber-brand__mark" aria-hidden="true">
            <span />
          </div>
          <h1>Orber</h1>
        </div>

        <div className="orber-header__nav">
          <Button
            type="button"
            variant="ghost"
            className={`date-button orber-nav-button ${showDatePicker ? 'is-active' : ''}`}
            onClick={toggleDatePicker}
            aria-expanded={showDatePicker}
          >
            <Calendar /> <span>Dates</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={`sensor-button orber-nav-button ${showSensorMenu ? 'is-active' : ''}`}
            onClick={toggleSensorMenu}
            aria-expanded={showSensorMenu}
          >
            <Activity /> <span>Sensors</span>
          </Button>
          {showDatePicker && (
            <Card
              className="date-picker-container orber-popover orber-popover--calendar"
              role="dialog"
              aria-label="Available acquisition dates"
            >
              <div className="orber-popover__eyebrow">Copernicus imagery</div>
              <h2>Select acquisition date</h2>
              <DayPicker
                mode="single"
                selected={selectedCalendarDate}
                onSelect={(date) => {
                  setSelectedAcquisitionDate(
                    date ? localDateToAcquisitionDate(date) : undefined,
                  );
                }}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                disabled={(date) =>
                  isLoadingAcquisitionDates ||
                  !availableAcquisitionDateSet.has(localDateToAcquisitionDate(date))
                }
                modifiers={{ available: availableCalendarDates }}
                modifiersClassNames={{ available: 'rdp-day_available' }}
                numberOfMonths={1}
                className="bg-transparent text-white"
                showOutsideDays
                fixedWeeks
              />
              <div className="orber-calendar-status" aria-live="polite">
                {isLoadingAcquisitionDates
                  ? 'Loading available Copernicus dates…'
                  : acquisitionDatesError
                    ? acquisitionDatesError
                    : availableAcquisitionDates.length === 0
                      ? 'No cloud-safe acquisitions in the last 12 months.'
                      : `${availableAcquisitionDates.length} cloud-safe acquisitions`}
              </div>
            </Card>
          )}

          {showSensorMenu && (
            <Card
              className="sensor-menu-container orber-popover orber-popover--sensors"
              role="dialog"
              aria-label="Available sensors"
            >
              <div className="orber-popover__eyebrow">Data sources</div>
              <h2>Available sensors</h2>
              <div className="orber-sensor-list">
                <button className="is-selected">
                  <span className="orber-sensor-dot" />
                  <span><strong>Sentinel-2</strong><small>Active · multispectral</small></span>
                </button>
                <button disabled>
                  <span className="orber-sensor-dot" />
                  <span><strong>PlanetScope</strong><small>Coming soon</small></span>
                </button>
              </div>
            </Card>
          )}
        </div>

        <div className="orber-header__actions">
          <div className="orber-search-wrap">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSearch}
              className={`orber-icon-button ${showSearch ? 'is-active' : ''}`}
              aria-label="Search"
              aria-expanded={showSearch}
            >
              <Search />
            </Button>

            {showSearch && (
              <Card className="orber-popover orber-search-popover">
                <div className="orber-search-field">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    placeholder="Search places..."
                    className="orber-search-input"
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="orber-search-clear"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {isSearching && (
                  <div className="text-center text-gray-400 py-2">
                    Searching...
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleLocationSelect(result)}
                        className="w-full text-left px-3 py-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-sm truncate"
                      >
                        {result.name}
                      </button>
                    ))}
                  </div>
                )}

                {!isSearching && searchQuery.length >= 3 && searchResults.length === 0 && (
                  <div className="text-center text-gray-400 py-2">
                    No results found
                  </div>
                )}
              </Card>
            )}
          </div>

          <Button type="button" variant="ghost" size="icon" className="orber-icon-button" aria-label="Notifications">
            <Bell />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="orber-user" aria-label="Account">
            <UserRound />
          </Button>
        </div>
      </nav>

      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          url={appConfig.basemapTileUrl}
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        />
        {selectedLayer && selectedIndicator?.type !== 'natural' && (
          <WMSTileLayer
            key={`${selectedLayer}-${selectedAcquisitionDate ?? 'latest'}`}
            url={appConfig.copernicusWmsUrl}
            layers={selectedLayer}
            format="image/png"
            transparent={true}
            version="1.3.0"
            params={{
              layers: selectedLayer,
              MAXCC: DEFAULT_MAX_CLOUD_COVERAGE,
              ...(selectedTileTime ? { TIME: selectedTileTime } : {}),
            } as unknown as L.WMSParams}
          />
        )}
        <DrawControl
          drawMode={drawMode}
          clearSignal={clearDrawingsSignal}
          onSave={handleSaveKML}
          onDrawingComplete={handleDrawingComplete}
        />
      </MapContainer>

      <div className="orber-map-controls" aria-label="Map controls">
        <button
          className={drawMode === 'polygon' ? 'is-active' : ''}
          onClick={() => setDrawMode(drawMode === 'polygon' ? null : 'polygon')}
          aria-label="Draw polygon"
        >
          <Pencil />
        </button>
        <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in">
          <ZoomIn />
        </button>
        <button
          className={drawMode === 'rectangle' ? 'is-active' : ''}
          onClick={() => setDrawMode(drawMode === 'rectangle' ? null : 'rectangle')}
          aria-label="Draw rectangle"
        >
          <Square />
        </button>
        <button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out">
          <ZoomOut />
        </button>
        <button
          onClick={() => setClearDrawingsSignal((signal) => signal + 1)}
          aria-label="Clear drawings"
        >
          <Trash2 />
        </button>
        <button onClick={() => mapRef.current?.setView(center, zoom)} aria-label="Reset view">
          <Home />
        </button>
      </div>

      <div
        className={`orber-panel orber-indicator-panel ${
          isPanelVisible ? 'is-visible' : 'is-hidden'
        }`}
      >
        <div className="orber-panel__heading">
          <h2>Indicators</h2>
        </div>
        <div className="orber-indicator-list">
          {INDICATORS.map((indicator) => {
            const Icon = indicator.icon;
            return (
              <button
                key={indicator.name}
                className={`orber-indicator-button ${
                  selectedIndicator?.name === indicator.name
                    ? 'is-selected'
                    : ''
                }`}
                onClick={() => handleIndicatorSelect(indicator)}
              >
                <span className="orber-indicator-button__icon"><Icon /></span>
                <span>{indicator.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        className="orber-panel-toggle"
        onClick={() => setIsPanelVisible(!isPanelVisible)}
        aria-label={isPanelVisible ? "Hide indicators" : "Show indicators"}
      >
        {isPanelVisible ? <ChevronLeft /> : <ChevronRight />}
      </button>

      {selectedIndicator && isDetailVisible && (
        <aside className="orber-panel orber-detail-panel" aria-label={`${selectedIndicator.name} details`}>
          <div className="orber-panel__heading">
            <h3>{selectedIndicator.name}</h3>
            <button onClick={() => setIsDetailVisible(false)} aria-label="Close details">
              <X />
            </button>
          </div>
          {pixelInfo && (
            <PointInfoSection
              info={pixelInfo}
              unit={selectedMeasurementScale?.unit}
              onClose={() => setPixelInfo(null)}
            />
          )}
          <div className="orber-layer-details">
            {selectedIndicator.type === 'discrete' ? (
              <div className="orber-legend-card">
                <div className="orber-legend-label">Color classes</div>
                <div className="orber-discrete-legend">
                  {selectedIndicator.indicators.map((ind, index) => (
                    <div key={index} className="orber-discrete-legend__item">
                      <span className={`orber-discrete-legend__swatch ${ind.color}`} />
                      <span>{ind.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedIndicator.type === 'natural' ? null : selectedMeasurementScale ? (
              <div className="orber-legend-card" aria-label="Measurement range">
                <div className="orber-continuous-legend">
                  <div className="orber-continuous-legend__values">
                    {[...selectedMeasurementScale.values].reverse().map((value) => (
                      <span key={value}>{value}</span>
                    ))}
                  </div>
                  <div className="orber-continuous-legend__bar">
                    <div
                      aria-label={`${selectedIndicator.name} color scale`}
                      style={{ backgroundImage: createMeasurementGradient(selectedMeasurementScale) }}
                    />
                  </div>
                  <div className="orber-continuous-legend__unit">{selectedMeasurementScale.unit}</div>
                </div>
              </div>
            ) : (
              <div className="orber-legend-card">
                <div className="orber-legend-label">Measurement range unavailable</div>
              </div>
            )}
            <p className="orber-layer-description">{selectedIndicator.description}</p>
          </div>
          <p className="orber-reference">
            {selectedIndicator.quote}
          </p>
        </aside>
      )}

      <ParameterLoader isVisible={isLoading} />
    </div>
  );
}
