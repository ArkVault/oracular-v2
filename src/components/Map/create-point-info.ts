import type {
  FeatureInfoResult,
  GeoPoint,
} from '@/features/analysis/domain/feature-info';
import { classifyWaterQuality } from '@/features/analysis/domain/quality';

import type { PointInfoData } from './PointInfoSection';

function coordinatesFrom(point: GeoPoint): [number, number] {
  return [point.lat, point.lng];
}

export function createNaturalColorPointInfo(point: GeoPoint): PointInfoData {
  return {
    value: null,
    quality: 'Unknown',
    coordinates: coordinatesFrom(point),
    message: 'Please select a water quality parameter to view point values',
  };
}

export function createAnalysisPointInfo(
  result: FeatureInfoResult,
  point: GeoPoint,
  layer: string,
): PointInfoData {
  return {
    value: result.value,
    ...(result.valueSource ? { valueSource: result.valueSource } : {}),
    ...(result.isOutOfArea ? { isOutOfArea: true } : {}),
    quality:
      result.value === null
        ? 'Unknown'
        : classifyWaterQuality(result.value, layer),
    coordinates: coordinatesFrom(point),
    ...(result.message ? { message: result.message } : {}),
    ...(result.acquisitionId ? { acquisitionId: result.acquisitionId } : {}),
    ...(result.acquisitionDate
      ? { acquisitionDate: result.acquisitionDate }
      : {}),
    ...(result.cloudCoverage !== undefined
      ? { cloudCoverage: result.cloudCoverage }
      : {}),
  };
}

export function createPointInfoError(point: GeoPoint): PointInfoData {
  return {
    value: null,
    quality: 'Unknown',
    coordinates: coordinatesFrom(point),
    message: 'Unable to load a real Copernicus value for this point.',
  };
}
