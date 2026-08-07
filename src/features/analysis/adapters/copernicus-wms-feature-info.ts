import type {
  FeatureInfoQuery,
  FeatureInfoResult,
} from '../domain/feature-info';
import { estimateMeasurementFromRenderedColor } from '../domain/color-measurement-estimate';
import { getMeasurementScale } from '../domain/measurement-scale';
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

function buildViewportParams(viewport: NonNullable<FeatureInfoQuery['viewport']>) {
  const width = Math.max(1, Math.round(viewport.width));
  const height = Math.max(1, Math.round(viewport.height));
  const pixelX = Math.min(width - 1, Math.max(0, Math.round(viewport.pixel.x)));
  const pixelY = Math.min(height - 1, Math.max(0, Math.round(viewport.pixel.y)));

  return {
    CRS: viewport.crs,
    BBOX: (viewport.crs === 'EPSG:4326'
      ? [
          viewport.bounds.south,
          viewport.bounds.west,
          viewport.bounds.north,
          viewport.bounds.east,
        ]
      : [
          viewport.bounds.west,
          viewport.bounds.south,
          viewport.bounds.east,
          viewport.bounds.north,
        ]).join(','),
    WIDTH: String(width),
    HEIGHT: String(height),
    I: String(pixelX),
    J: String(pixelY),
  };
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
      ...(query.viewport
        ? buildViewportParams(query.viewport)
        : {
            CRS: 'EPSG:4326',
            BBOX: buildPointBbox(query.point),
            WIDTH: '1',
            HEIGHT: '1',
            I: '0',
            J: '0',
          }),
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
              message: getMeasurementScale(query.layer)
                ? 'Rendered pixel color is not calibrated in the current measurement scale.'
                : 'Copernicus returned rendered channels, not a scalar analysis value.',
            }
          : {}),
    };
  }
}
