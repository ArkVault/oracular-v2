import { describe, expect, it, vi } from 'vitest';
import { CopernicusWfsAcquisitionDateProvider } from './copernicus-wfs-acquisition-dates';

describe('CopernicusWfsAcquisitionDateProvider', () => {
  it('should request Sentinel-2 tiles for the visible bounds and return unique cloud-safe dates', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        type: 'FeatureCollection',
        features: [
          { properties: { id: 'scene-a', date: '2026-08-04', time: '17:38:20.471', cloudCoverPercentage: 7.78 } },
          { properties: { id: 'scene-b', date: '2026-08-04', time: '17:38:17.066', cloudCoverPercentage: 3.8 } },
          { properties: { id: 'scene-c', date: '2026-07-25', time: '17:38:18.023', cloudCoverPercentage: 8.76 } },
          { properties: { id: 'scene-d', date: '2026-07-20', time: '17:38:20.183', cloudCoverPercentage: 10 } },
          { properties: { id: 'scene-e', date: 'not-a-date', time: '17:38:17.000', cloudCoverPercentage: 2 } },
          { properties: { id: 'scene-f', date: '2026-07-15', time: 'not-a-time', cloudCoverPercentage: 2 } },
        ],
      }), { status: 200 }),
    );
    const provider = new CopernicusWfsAcquisitionDateProvider(
      'https://example.test/ogc/wms/instance-id',
      fetcher,
    );

    // ACT
    const result = await provider.list({
      bounds: { south: 20.15, west: -103.35, north: 20.4, east: -103.05 },
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-08-06T00:00:00.000Z'),
      maxCloudCoverage: 10,
    });

    // ASSERT
    expect(result).toEqual([
      {
        date: '2026-08-04',
        acquiredAt: '2026-08-04T17:38:17.066Z',
        cloudCoverage: 3.8,
        acquisitionId: 'scene-b',
      },
      {
        date: '2026-07-25',
        acquiredAt: '2026-07-25T17:38:18.023Z',
        cloudCoverage: 8.76,
        acquisitionId: 'scene-c',
      },
    ]);
    const requestedUrl = new URL(fetcher.mock.calls[0][0]);
    expect(requestedUrl.pathname).toBe('/ogc/wfs/instance-id');
    expect(requestedUrl.searchParams.get('TYPENAMES')).toBe('S2.TILE');
    expect(requestedUrl.searchParams.get('BBOX')).toBe('20.15,-103.35,20.4,-103.05');
    expect(requestedUrl.searchParams.get('TIME')).toBe('2026-01-01/2026-08-06');
    expect(requestedUrl.searchParams.get('MAXCC')).toBe('10');
  });

  it('should fail clearly when Copernicus does not return a successful feature response', async () => {
    // ARRANGE
    const provider = new CopernicusWfsAcquisitionDateProvider(
      'https://example.test/ogc/wms/instance-id',
      vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })),
    );

    // ACT + ASSERT
    await expect(provider.list({
      bounds: { south: 20, west: -104, north: 21, east: -103 },
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-08-06T00:00:00.000Z'),
      maxCloudCoverage: 10,
    })).rejects.toThrow('Copernicus acquisition dates request failed (503)');
  });

  it('should request Sentinel-1 footprints without applying an optical cloud filter', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        type: 'FeatureCollection',
        features: [{
          properties: {
            id: 'S1D_IW_GRDH_1SDV_20260806T003127_TEST.SAFE',
            date: '2026-08-06',
            time: '00:31:27',
          },
        }],
      }), { status: 200 }),
    );
    const provider = new CopernicusWfsAcquisitionDateProvider(
      'https://example.test/ogc/wms/instance-id',
      fetcher,
    );

    // ACT
    const result = await provider.list({
      bounds: { south: 19, west: -96.25, north: 19.2, east: -96.05 },
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-08-08T00:00:00.000Z'),
      maxCloudCoverage: 10,
      collection: 'sentinel-1',
    });

    // ASSERT
    expect(result).toEqual([{
      date: '2026-08-06',
      acquiredAt: '2026-08-06T00:31:27.000Z',
      cloudCoverage: 0,
      acquisitionId: 'S1D_IW_GRDH_1SDV_20260806T003127_TEST.SAFE',
    }]);
    const requestedUrl = new URL(fetcher.mock.calls[0][0]);
    expect(requestedUrl.searchParams.get('TYPENAMES')).toBe('DSS3');
    expect(requestedUrl.searchParams.has('MAXCC')).toBe(false);
  });
});
