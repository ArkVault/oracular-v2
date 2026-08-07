export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TimeRange {
  from: Date;
  to: Date;
}

export interface FeatureInfoViewport {
  crs: 'EPSG:4326' | 'EPSG:3857';
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  width: number;
  height: number;
  pixel: {
    x: number;
    y: number;
  };
}

export interface FeatureInfoQuery {
  layer: string;
  point: GeoPoint;
  viewport?: FeatureInfoViewport;
  maxCloudCoverage?: number;
  timeRange?: TimeRange;
}

export interface FeatureInfoResult {
  value: number | null;
  valueSource?: 'color-estimate';
  isOutOfArea?: boolean;
  acquisitionId?: string;
  acquisitionDate?: string;
  cloudCoverage?: number;
  outputValues: number[];
  message?: string;
}
