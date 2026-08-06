import type {
  FeatureInfoQuery,
  FeatureInfoResult,
} from '../domain/feature-info';
import { estimateMeasurementFromRenderedColor } from '../domain/color-measurement-estimate';
import type { FeatureInfoProvider } from '../ports/feature-info-provider';

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
      BBOX: buildPointBbox(query.point),
      CRS: 'EPSG:4326',
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

    const response = await this.fetcher(url, { signal });
    if (!response.ok) {
      throw new Error(`Copernicus GetFeatureInfo failed with HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    const properties = getFeatureProperties(payload);

    if (!properties) {
      return {
        value: null,
        outputValues: [],
        message: 'No Copernicus coverage is available for this point and date.',
      };
    }

    const outputValues = getOutputValues(properties);
    const explicitValue =
      toFiniteNumber(properties.value) ?? toFiniteNumber(properties[query.layer]);
    const scalarValue = explicitValue ?? (outputValues.length === 1 ? outputValues[0] : null);
    const colorEstimate =
      scalarValue === null
        ? estimateMeasurementFromRenderedColor(query.layer, outputValues)
        : undefined;
    const isOutOfArea = colorEstimate === null;
    const numericColorEstimate =
      typeof colorEstimate === 'number' ? colorEstimate : undefined;
    const value = scalarValue ?? numericColorEstimate ?? null;
    const acquisitionId = toStringValue(properties.id);
    const acquisitionDate = toStringValue(properties.date);
    const cloudCoverage = toFiniteNumber(properties.cloudCoverPercentage);

    return {
      value,
      ...(numericColorEstimate !== undefined
        ? { valueSource: 'color-estimate' as const }
        : {}),
      ...(isOutOfArea ? { isOutOfArea: true } : {}),
      ...(acquisitionId ? { acquisitionId } : {}),
      ...(acquisitionDate ? { acquisitionDate } : {}),
      ...(cloudCoverage !== undefined ? { cloudCoverage } : {}),
      outputValues,
      ...(numericColorEstimate !== undefined
        ? {
            message:
              'Estimated from the rendered pixel color; this is not a direct sensor measurement.',
          }
        : !isOutOfArea && scalarValue === null && outputValues.length > 1
          ? {
              message:
                'Copernicus returned rendered channels, not a scalar analysis value.',
            }
          : {}),
    };
  }
}
