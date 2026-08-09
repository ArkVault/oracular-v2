import * as React from 'react';
import type L from 'leaflet';
import { MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet';

import { appConfig } from '@/app/config';
import { DEFAULT_MAX_CLOUD_COVERAGE } from '@/features/acquisitions/domain/cloud-coverage';

import type { IndicatorDefinition } from './indicator-definitions';
import type { DrawMode } from './map-types';

const DrawControl = React.lazy(async () => {
  const module = await import('./DrawControl');
  return { default: module.DrawControl };
});

interface MapCanvasProps {
  center: [number, number];
  clearDrawingsSignal: number;
  drawMode: DrawMode;
  drawingToolsActivated: boolean;
  mapRef: React.MutableRefObject<L.Map | null>;
  onDrawingComplete: () => void;
  onSaveKml: (kml: string) => void;
  onWmsLoadingChange: (isLoading: boolean) => void;
  selectedAcquisitionDate?: string;
  selectedIndicator: IndicatorDefinition;
  selectedLayer: string;
  selectedTileTime?: string;
  zoom: number;
}

function encodeEvalscript(evalscript: string): string {
  const bytes = new TextEncoder().encode(evalscript);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function MapCanvas({
  center,
  clearDrawingsSignal,
  drawMode,
  drawingToolsActivated,
  mapRef,
  onDrawingComplete,
  onSaveKml,
  onWmsLoadingChange,
  selectedAcquisitionDate,
  selectedIndicator,
  selectedLayer,
  selectedTileTime,
  zoom,
}: MapCanvasProps) {
  const renderConfig = selectedIndicator.type === 'natural'
    ? undefined
    : selectedIndicator.render;
  const renderedLayer = renderConfig?.layer ?? selectedLayer;
  const wmsLayerKey = [
    selectedLayer,
    renderedLayer,
    selectedAcquisitionDate ?? 'latest-date',
    selectedTileTime ?? 'latest-time',
  ].join(':');
  const [readyWmsLayerKey, setReadyWmsLayerKey] = React.useState<string>();
  const isWmsLayerReady = readyWmsLayerKey === wmsLayerKey;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full"
      zoomControl={false}
      ref={mapRef}
    >
      <TileLayer
        url={appConfig.basemapTileUrl}
        attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
      />
      {selectedLayer && selectedIndicator.type !== 'natural' && (
        <WMSTileLayer
          key={wmsLayerKey}
          url={appConfig.copernicusWmsUrl}
          layers={renderedLayer}
          format="image/png"
          transparent
          version="1.3.0"
          keepBuffer={0}
          opacity={isWmsLayerReady ? 1 : 0}
          eventHandlers={{
            loading: () => {
              setReadyWmsLayerKey(undefined);
              onWmsLoadingChange(true);
            },
            load: () => {
              setReadyWmsLayerKey(wmsLayerKey);
              onWmsLoadingChange(false);
            },
          }}
          params={{
            layers: renderedLayer,
            ...(selectedIndicator.acquisitionCollection === 'sentinel-1'
              ? {}
              : { MAXCC: DEFAULT_MAX_CLOUD_COVERAGE }),
            ...(renderConfig?.evalscript
              ? { EVALSCRIPT: encodeEvalscript(renderConfig.evalscript) }
              : {}),
            ...(selectedTileTime ? { TIME: selectedTileTime } : {}),
          } as unknown as L.WMSParams}
        />
      )}
      {drawingToolsActivated && (
        <React.Suspense fallback={null}>
          <DrawControl
            drawMode={drawMode}
            clearSignal={clearDrawingsSignal}
            onSave={onSaveKml}
            onDrawingComplete={onDrawingComplete}
          />
        </React.Suspense>
      )}
    </MapContainer>
  );
}
