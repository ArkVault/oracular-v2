import { isCloudCoverageEligible } from '../domain/cloud-coverage';
import type {
  AcquisitionDate,
  AcquisitionDateProvider,
  AcquisitionDateQuery,
} from '../ports/acquisition-date-provider';
import { createExternalRequestInit } from '@/lib/external-request';

interface WfsFeatureCollection {
  features?: Array<{
    properties?: {
      id?: unknown;
      date?: unknown;
      time?: unknown;
      cloudCoverPercentage?: unknown;
    };
  }>;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?$/;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isValidIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ISO_DATE_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
  );
}

function toAcquisitionTimestamp(date: string, time: unknown): string | undefined {
  if (typeof time !== 'string' || !ISO_TIME_PATTERN.test(time)) {
    return undefined;
  }

  const timestamp = new Date(`${date}T${time}Z`);
  return Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString();
}

export class CopernicusWfsAcquisitionDateProvider implements AcquisitionDateProvider {
  private readonly fetcher: typeof fetch;

  constructor(
    private readonly wmsUrl: string,
    fetcher?: typeof fetch,
  ) {
    this.fetcher = fetcher ?? ((input, init) => globalThis.fetch(input, init));
  }

  async list(query: AcquisitionDateQuery, signal?: AbortSignal): Promise<AcquisitionDate[]> {
    const url = new URL(this.wmsUrl.replace('/ogc/wms/', '/ogc/wfs/'));
    const isSentinel1 = query.collection === 'sentinel-1';
    const parameters: Record<string, string> = {
      SERVICE: 'WFS',
      VERSION: '2.0.0',
      REQUEST: 'GetFeature',
      TYPENAMES: isSentinel1 ? 'DSS3' : 'S2.TILE',
      OUTPUTFORMAT: 'application/json',
      SRSNAME: 'EPSG:4326',
      // WFS 2.0 follows the EPSG:4326 latitude/longitude axis order.
      BBOX: [
        query.bounds.south,
        query.bounds.west,
        query.bounds.north,
        query.bounds.east,
      ].join(','),
      TIME: `${toIsoDate(query.from)}/${toIsoDate(query.to)}`,
      MAXFEATURES: '500',
    };
    if (!isSentinel1) {
      parameters.MAXCC = String(query.maxCloudCoverage);
    }
    url.search = new URLSearchParams(parameters).toString();

    const response = await this.fetcher(url, createExternalRequestInit(signal));
    if (!response.ok) {
      throw new Error(`Copernicus acquisition dates request failed (${response.status})`);
    }

    const payload = await response.json() as WfsFeatureCollection;
    const datesByDay = new Map<string, AcquisitionDate>();

    for (const feature of payload.features ?? []) {
      const properties = feature.properties;
      const cloudCoverage = isSentinel1 ? 0 : Number(properties?.cloudCoverPercentage);
      const date = properties?.date;
      const acquiredAt = isValidIsoDate(date)
        ? toAcquisitionTimestamp(date, properties?.time)
        : undefined;
      const acquisitionId = properties?.id;

      if (
        !isValidIsoDate(date) ||
        !acquiredAt ||
        typeof acquisitionId !== 'string' ||
        (!isSentinel1 && !isCloudCoverageEligible(cloudCoverage, query.maxCloudCoverage))
      ) {
        continue;
      }

      const current = datesByDay.get(date);
      if (!current || cloudCoverage < current.cloudCoverage) {
        datesByDay.set(date, { date, acquiredAt, cloudCoverage, acquisitionId });
      }
    }

    return [...datesByDay.values()].sort((left, right) => right.date.localeCompare(left.date));
  }
}
