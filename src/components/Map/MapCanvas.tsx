import type * as React from 'react';
import type L from 'leaflet';
import { MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet';

import { appConfig } from '@/app/config';
import { DEFAULT_MAX_CLOUD_COVERAGE } from '@/features/acquisitions/domain/cloud-coverage';

import { DrawControl } from './DrawControl';
import type { IndicatorDefinition } from './indicator-definitions';
import type { DrawMode } from './map-types';

interface MapCanvasProps {
  center: [number, number];
  clearDrawingsSignal: number;
  drawMode: DrawMode;
  mapRef: React.MutableRefObject<L.Map | null>;
  onDrawingComplete: () => void;
  onSaveKml: (kml: string) => void;
  selectedAcquisitionDate?: string;
  selectedIndicator: IndicatorDefinition;
  selectedLayer: string;
  selectedTileTime?: string;
  zoom: number;
}

export function MapCanvas({
  center,
  clearDrawingsSignal,
  drawMode,
  mapRef,
  onDrawingComplete,
  onSaveKml,
  selectedAcquisitionDate,
  selectedIndicator,
  selectedLayer,
  selectedTileTime,
  zoom,
}: MapCanvasProps) {
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
          key={`${selectedLayer}-${selectedAcquisitionDate ?? 'latest'}`}
          url={appConfig.copernicusWmsUrl}
          layers={selectedLayer}
          format="image/png"
          transparent
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
        onSave={onSaveKml}
        onDrawingComplete={onDrawingComplete}
      />
    </MapContainer>
  );
}
