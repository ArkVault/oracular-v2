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
  parameter: string;
  value: number | null;
  unit?: string;
  method?: string;
  methodVersion?: string;
  valueSource:
    | 'provider-scalar'
    | 'scientific-algorithm'
    | 'calibrated-color'
    | 'spectral-proxy'
    | 'unavailable';
  isEstimate: boolean;
  confidence?: 'low' | 'medium' | 'high';
  uncertainty?: number;
  colorDistance?: number;
  isOutOfArea?: boolean;
  acquisitionId?: string;
  acquisitionDate?: string;
  cloudCoverage?: number;
  algorithmReference?: string;
  outputValues: number[];
  message?: string;
}
