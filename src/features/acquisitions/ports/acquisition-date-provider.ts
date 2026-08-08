export interface AcquisitionSearchBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export type AcquisitionCollection = 'sentinel-1' | 'sentinel-2';

export interface AcquisitionDateQuery {
  bounds: AcquisitionSearchBounds;
  from: Date;
  to: Date;
  maxCloudCoverage: number;
  collection?: AcquisitionCollection;
}

export interface AcquisitionDate {
  date: string;
  acquiredAt: string;
  cloudCoverage: number;
  acquisitionId: string;
}

export interface AcquisitionDateProvider {
  list(query: AcquisitionDateQuery, signal?: AbortSignal): Promise<AcquisitionDate[]>;
}
