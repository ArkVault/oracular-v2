import { describe, expect, it, vi } from 'vitest';

import { CopernicusWmsFeatureInfoProvider } from './copernicus-wms-feature-info';

const WMS_URL = 'https://example.test/ogc/wms/instance-id';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function featureResponse(properties: Record<string, unknown>): Response {
  return jsonResponse({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties }],
  });
}

describe('CopernicusWmsFeatureInfoProvider', () => {
  it('should build a zoom-independent WMS 1.3 point query with the selected date', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ type: 'FeatureCollection', features: [] }),
    );
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    await provider.get({
      layer: 'CHLA',
      point: { lat: 51.505, lng: -0.09 },
      maxCloudCoverage: 10,
      timeRange: {
        from: new Date('2026-07-31T00:00:00.000Z'),
        to: new Date('2026-07-31T23:59:59.999Z'),
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
      BBOX: '51.5049,-0.0901,51.5051,-0.0899',
      WIDTH: '1',
      HEIGHT: '1',
      I: '0',
      J: '0',
      MAXCC: '10',
      TIME: '2026-07-31T00:00:00.000Z/2026-07-31T23:59:59.999Z',
    });
  });

  it('should accept only an explicit provider scalar with matching unit and provenance', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(featureResponse({
      id: 'S2_SCENE_ID',
      date: '2026-07-31',
      cloudCoverPercentage: 6.04,
      value: '4.2',
      unit: 'mg/m³',
      method: 'configured-provider-scalar',
      methodVersion: 'chla-v1',
      algorithmReference: 'https://example.test/chla-v1',
    }));
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const result = await provider.get({
      layer: 'CHLA',
      point: { lat: 51.505, lng: -0.09 },
    });

    // ASSERT
    expect(result).toEqual({
      parameter: 'CHLA',
      value: 4.2,
      unit: 'mg/m³',
      valueSource: 'provider-scalar',
      isEstimate: false,
      method: 'configured-provider-scalar',
      methodVersion: 'chla-v1',
      algorithmReference: 'https://example.test/chla-v1',
      acquisitionId: 'S2_SCENE_ID',
      acquisitionDate: '2026-07-31',
      cloudCoverage: 6.04,
      outputValues: [],
    });
  });

  it.each([
    ['NaN', 'mg/m³', 'configured-provider-scalar'],
    ['Infinity', 'mg/m³', 'configured-provider-scalar'],
    ['-0.1', 'mg/m³', 'configured-provider-scalar'],
    ['4.2', 'mg/L', 'configured-provider-scalar'],
    ['4.2', 'mg/m³', undefined],
  ])('should reject an invalid or incompatible provider scalar', async (value, unit, method) => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(featureResponse({ value, unit, method }));
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const result = await provider.get({
      layer: 'CHLA',
      point: { lat: 51.505, lng: -0.09 },
    });

    // ASSERT
    expect(result).toMatchObject({
      parameter: 'CHLA',
      value: null,
      valueSource: 'unavailable',
      isEstimate: false,
    });
    expect(result.isOutOfArea).toBeUndefined();
  });

  it('should never treat one anonymous out channel as a scientific scalar', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(featureResponse({ out1: '4.2' }));
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const result = await provider.get({
      layer: 'CHLA',
      point: { lat: 51.505, lng: -0.09 },
    });

    // ASSERT
    expect(result).toMatchObject({
      value: null,
      valueSource: 'unavailable',
      outputValues: [4.2],
    });
  });

  it.each([
    ['colored', ['0.80635', '0.760724', '0.607419']],
    ['black', ['0', '0', '0']],
  ])('should keep a rendered %s MCI response unavailable as a point scalar', async (_label, channels) => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(featureResponse({
      id: 'S2C_MSIL1C_SCENE',
      out1: channels[0],
      out2: channels[1],
      out3: channels[2],
    }));
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const result = await provider.get({
      layer: 'CHLA',
      point: { lat: 20.2, lng: -103.05 },
    });

    // ASSERT
    expect(result).toMatchObject({
      value: null,
      valueSource: 'unavailable',
      isEstimate: false,
      acquisitionId: 'S2C_MSIL1C_SCENE',
      message: 'The visualization has a documented qualitative index palette, but this point response contains rendered color channels rather than the underlying scalar MCI value. It must not be interpreted as chlorophyll-a concentration.',
    });
    expect(result.isOutOfArea).toBeUndefined();
  });

  it('should reserve out-of-area for an explicit zero data mask', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      featureResponse({ dataMask: 0, out1: '0', out2: '0', out3: '0' }),
    );
    const provider = new CopernicusWmsFeatureInfoProvider(WMS_URL, fetcher as typeof fetch);

    // ACT
    const result = await provider.get({
      layer: 'CHLA',
      point: { lat: 0, lng: 0 },
    });

    // ASSERT
    expect(result).toMatchObject({
      value: null,
      valueSource: 'unavailable',
      isOutOfArea: true,
    });
  });

  it('should return an out-of-area result when the provider returns no feature', async () => {
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
    expect(result).toMatchObject({
      value: null,
      valueSource: 'unavailable',
      isEstimate: false,
      isOutOfArea: true,
      outputValues: [],
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
