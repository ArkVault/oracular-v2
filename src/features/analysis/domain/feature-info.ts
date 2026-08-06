export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TimeRange {
  from: Date;
  to: Date;
}

export interface FeatureInfoQuery {
  layer: string;
  point: GeoPoint;
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
