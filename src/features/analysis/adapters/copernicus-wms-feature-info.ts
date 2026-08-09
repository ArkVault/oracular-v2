import type {
  FeatureInfoQuery,
  FeatureInfoResult,
} from '../domain/feature-info';
import { getMeasurementDefinition } from '../domain/measurement-scale';
import type { FeatureInfoProvider } from '../ports/feature-info-provider';
import { createExternalRequestInit } from '@/lib/external-request';

const POINT_QUERY_DELTA = 0.0001;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function getFeatureProperties(payload: unknown): Record<string, unknown> | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.features)) {
    return undefined;
  }

  const feature = payload.features[0];
  if (!isRecord(feature) || !isRecord(feature.properties)) {
    return undefined;
  }

  return feature.properties;
}

function getOutputValues(properties: Record<string, unknown>): number[] {
  return Object.entries(properties)
    .filter(([key]) => /^out\d+$/.test(key))
    .sort(([left], [right]) => Number(left.slice(3)) - Number(right.slice(3)))
    .map(([, value]) => toFiniteNumber(value))
    .filter((value): value is number => value !== undefined);
}

function buildPointBbox({ lat, lng }: FeatureInfoQuery['point']): string {
  return [
    lat - POINT_QUERY_DELTA,
    lng - POINT_QUERY_DELTA,
    lat + POINT_QUERY_DELTA,
    lng + POINT_QUERY_DELTA,
  ]
    .map((coordinate) => coordinate.toFixed(4))
    .join(',');
}

export class CopernicusWmsFeatureInfoProvider implements FeatureInfoProvider {
  private readonly fetcher: typeof fetch;

  constructor(
    private readonly baseUrl: string,
    fetcher?: typeof fetch,
  ) {
    this.fetcher =
      fetcher ?? ((input, init) => globalThis.fetch(input, init));
  }

  async get(query: FeatureInfoQuery, signal?: AbortSignal): Promise<FeatureInfoResult> {
    const url = new URL(this.baseUrl);
    const params: Record<string, string> = {
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      QUERY_LAYERS: query.layer,
      INFO_FORMAT: 'application/json',
      CRS: 'EPSG:4326',
      BBOX: buildPointBbox(query.point),
      WIDTH: '1',
      HEIGHT: '1',
      I: '0',
      J: '0',
    };

    if (query.maxCloudCoverage !== undefined) {
      params.MAXCC = String(query.maxCloudCoverage);
    }

    if (query.timeRange) {
      params.TIME = `${query.timeRange.from.toISOString()}/${query.timeRange.to.toISOString()}`;
    }

    url.search = new URLSearchParams(params).toString();

    const response = await this.fetcher(url, createExternalRequestInit(signal));
    if (!response.ok) {
      throw new Error(`Copernicus GetFeatureInfo failed with HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    const properties = getFeatureProperties(payload);

    if (!properties) {
      return {
        parameter: query.layer,
        value: null,
        valueSource: 'unavailable',
        isEstimate: false,
        isOutOfArea: true,
        outputValues: [],
        message: 'No Copernicus coverage is available for this point and date.',
      };
    }

    const outputValues = getOutputValues(properties);
    const definition = getMeasurementDefinition(query.layer);
    const explicitValue = toFiniteNumber(properties.value);
    const providerUnit = toStringValue(properties.unit);
    const method = toStringValue(properties.method);
    const scalarIsValid =
      definition !== undefined &&
      explicitValue !== undefined &&
      explicitValue >= definition.minimum &&
      providerUnit === definition.unit &&
      method !== undefined;
    const dataMask = toFiniteNumber(properties.dataMask);
    const isOutOfArea = dataMask === 0;
    const acquisitionId = toStringValue(properties.id);
    const acquisitionDate = toStringValue(properties.date);
    const cloudCoverage = toFiniteNumber(properties.cloudCoverPercentage);
    const methodVersion = toStringValue(properties.methodVersion);
    const algorithmReference = toStringValue(properties.algorithmReference);

    return {
      parameter: query.layer,
      value: scalarIsValid ? explicitValue : null,
      ...(scalarIsValid ? { unit: definition.unit } : {}),
      valueSource: scalarIsValid ? 'provider-scalar' : 'unavailable',
      isEstimate: false,
      ...(scalarIsValid ? { method } : {}),
      ...(scalarIsValid && methodVersion ? { methodVersion } : {}),
      ...(scalarIsValid && algorithmReference ? { algorithmReference } : {}),
      ...(isOutOfArea ? { isOutOfArea: true } : {}),
      ...(acquisitionId ? { acquisitionId } : {}),
      ...(acquisitionDate ? { acquisitionDate } : {}),
      ...(cloudCoverage !== undefined ? { cloudCoverage } : {}),
      outputValues,
      ...(!scalarIsValid && !isOutOfArea
        ? {
            message: outputValues.length >= 3
              ? 'Region-specific calibration data may be supplied to improve accuracy and support more precise concentration estimates. Until those data and the layer\'s scientific value-to-color mapping are available, results should be interpreted qualitatively.'
              : 'A scientifically traceable scalar is not available for this point.',
          }
        : isOutOfArea
          ? { message: 'Out of the analytical area (provider dataMask=0).' }
          : {}),
    };
  }
}
