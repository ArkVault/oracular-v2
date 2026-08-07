export interface AcquisitionSearchBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface AcquisitionDateQuery {
  bounds: AcquisitionSearchBounds;
  from: Date;
  to: Date;
  maxCloudCoverage: number;
}

export interface AcquisitionDate {
  date: string;
  cloudCoverage: number;
  acquisitionId: string;
}

export interface AcquisitionDateProvider {
  list(query: AcquisitionDateQuery, signal?: AbortSignal): Promise<AcquisitionDate[]>;
}
