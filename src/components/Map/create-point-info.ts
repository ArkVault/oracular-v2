import type {
  FeatureInfoResult,
  GeoPoint,
} from '@/features/analysis/domain/feature-info';

import type { PointInfoData } from './PointInfoSection';

function coordinatesFrom(point: GeoPoint): [number, number] {
  return [point.lat, point.lng];
}

export function createNaturalColorPointInfo(point: GeoPoint): PointInfoData {
  return {
    parameter: 'Natural Color',
    value: null,
    valueSource: 'unavailable',
    isEstimate: false,
    quality: 'Unknown',
    coordinates: coordinatesFrom(point),
    message: 'Please select a water quality parameter to view point values',
  };
}

export function createAnalysisPointInfo(
  result: FeatureInfoResult,
  point: GeoPoint,
): PointInfoData {
  return {
    parameter: result.parameter,
    value: result.value,
    ...(result.unit ? { unit: result.unit } : {}),
    valueSource: result.valueSource,
    isEstimate: result.isEstimate,
    ...(result.method ? { method: result.method } : {}),
    ...(result.methodVersion ? { methodVersion: result.methodVersion } : {}),
    ...(result.confidence ? { confidence: result.confidence } : {}),
    ...(result.uncertainty !== undefined ? { uncertainty: result.uncertainty } : {}),
    ...(result.colorDistance !== undefined ? { colorDistance: result.colorDistance } : {}),
    ...(result.algorithmReference ? { algorithmReference: result.algorithmReference } : {}),
    ...(result.isOutOfArea ? { isOutOfArea: true } : {}),
    quality: 'Unknown',
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
    parameter: 'Unknown',
    value: null,
    valueSource: 'unavailable',
    isEstimate: false,
    quality: 'Unknown',
    coordinates: coordinatesFrom(point),
    message: 'Unable to load a real Copernicus value for this point.',
  };
}
