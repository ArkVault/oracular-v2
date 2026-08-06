import { describe, expect, it, vi } from 'vitest';
import { CopernicusWmsFeatureInfoProvider } from './copernicus-wms-feature-info';

const WMS_URL = 'https://example.test/ogc/wms/instance-id';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('CopernicusWmsFeatureInfoProvider', () => {
  it('should call the global fetch function without rebinding its receiver', async () => {
    // ARRANGE
    const browserLikeFetch = vi.fn(function (this: unknown) {
      if (this !== globalThis && this !== undefined) {
        throw new TypeError('Illegal invocation');
      }

      return Promise.resolve(
        jsonResponse({ type: 'FeatureCollection', features: [] }),
      );
    });
    vi.stubGlobal('fetch', browserLikeFetch);
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL);

    // ACT
    const request = provider.get({
      layer: 'CHLA',
      point: { lat: 51.505, lng: -0.09 },
    });

    // ASSERT
    await expect(request).resolves.toMatchObject({ value: null });
    vi.unstubAllGlobals();
  });

  it('should build a WMS 1.3 point query using EPSG:4326 axis order', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        type: 'FeatureCollection',
        features: [],
      }),
    );
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    await provider.get({
      layer: 'CHLA',
      point: { lat: 51.505, lng: -0.09 },
      maxCloudCoverage: 10,
      timeRange: {
        from: new Date('2026-07-01T00:00:00.000Z'),
        to: new Date('2026-07-31T23:59:59.000Z'),
      },
    });

    // ASSERT
    const requestUrl = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(Object.fromEntries(requestUrl.searchParams)).toMatchObject({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      QUERY_LAYERS: 'CHLA',
      INFO_FORMAT: 'application/json',
      CRS: 'EPSG:4326',
      WIDTH: '1',
      HEIGHT: '1',
      I: '0',
      J: '0',
      MAXCC: '10',
      TIME: '2026-07-01T00:00:00.000Z/2026-07-31T23:59:59.000Z',
    });
    expect(requestUrl.searchParams.get('BBOX')).toBe(
      '51.5049,-0.0901,51.5051,-0.0899',
    );
  });

  it('should return a real scalar value and acquisition metadata', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              id: 'S2_SCENE_ID',
              date: '2026-07-31',
              cloudCoverPercentage: 6.04,
              out1: '4.2',
            },
          },
        ],
      }),
    );
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const result = await provider.get({
      layer: 'CHLA',
      point: { lat: 51.505, lng: -0.09 },
    });

    // ASSERT
    expect(result).toEqual({
      value: 4.2,
      acquisitionId: 'S2_SCENE_ID',
      acquisitionDate: '2026-07-31',
      cloudCoverage: 6.04,
      outputValues: [4.2],
    });
  });

  it('should return a clearly labeled color estimate for a rendered analytical pixel', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              id: 'S2_RGB_SCENE',
              out1: '0.771527',
              out2: '0.750902',
              out3: '0.610637',
            },
          },
        ],
      }),
    );
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const result = await provider.get({
      layer: 'CHLA',
      point: { lat: 51.505, lng: -0.09 },
    });

    // ASSERT
    expect(result).toMatchObject({
      valueSource: 'color-estimate',
      acquisitionId: 'S2_RGB_SCENE',
      outputValues: [0.771527, 0.750902, 0.610637],
      message: 'Estimated from the rendered pixel color; this is not a direct sensor measurement.',
    });
    expect(result.value).toBeCloseTo(2.56, 2);
  });

  it('should identify a dark rendered pixel as outside the area of interest', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { out1: '8', out2: '8', out3: '8' },
          },
        ],
      }),
    );
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const result = await provider.get({
      layer: 'CHLA',
      point: { lat: 51.505, lng: -0.09 },
    });

    // ASSERT
    expect(result).toMatchObject({
      value: null,
      isOutOfArea: true,
      outputValues: [8, 8, 8],
    });
  });

  it('should not fabricate a color estimate for a layer without a continuous scale', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { out1: '132', out2: '204', out3: '22' },
          },
        ],
      }),
    );
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const result = await provider.get({
      layer: 'INCENDIOS-FORESTALES',
      point: { lat: 51.505, lng: -0.09 },
    });

    // ASSERT
    expect(result).toMatchObject({
      value: null,
      outputValues: [132, 204, 22],
      message: 'Copernicus returned rendered channels, not a scalar analysis value.',
    });
  });

  it('should return an explicit no-coverage result when no feature is available', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ type: 'FeatureCollection', features: [] }),
    );
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const result = await provider.get({
      layer: 'CHLA',
      point: { lat: 0, lng: 0 },
    });

    // ASSERT
    expect(result).toEqual({
      value: null,
      outputValues: [],
      message: 'No Copernicus coverage is available for this point and date.',
    });
  });

  it('should reject an HTTP error instead of returning a fabricated value', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ error: 'denied' }, 401));
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const request = provider.get({
      layer: 'CHLA',
      point: { lat: 51.505, lng: -0.09 },
    });

    // ASSERT
    await expect(request).rejects.toThrow('Copernicus GetFeatureInfo failed with HTTP 401');
  });
});
