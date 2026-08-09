import { describe, expect, it } from 'vitest';

import {
  buildSentinel1BackscatterTileUrl,
  decodeSentinel1Backscatter,
  renderOilSpillClasses,
} from './sentinel1-wms-tile';
import { OilSpillClass } from '../domain/contextual-oil-screening';

describe('Sentinel-1 WMS contextual tile adapter', () => {
  it('should request VV and VH from the Sentinel-1 layer for the selected day', () => {
    // ARRANGE
    const wmsUrl = 'https://example.test/ogc/wms/instance-id';

    // ACT
    const url = new URL(buildSentinel1BackscatterTileUrl({
      bbox: [-10, -5, 10, 5],
      height: 280,
      selectedDate: '2026-08-02',
      width: 280,
      wmsUrl,
    }));
    const evalscript = atob(url.searchParams.get('EVALSCRIPT') ?? '');

    // ASSERT
    expect(url.searchParams.get('LAYERS')).toBe('INFRAR');
    expect(url.searchParams.get('TIME')).toBe(
      '2026-08-02T00:00:00Z/2026-08-02T23:59:59Z',
    );
    expect(url.searchParams.has('MAXCC')).toBe(false);
    expect(evalscript).toContain('bands: ["VV", "VH", "dataMask"]');
    expect(evalscript).toContain('units: "LINEAR_POWER"');
  });

  it('should decode VV and VH dB values while failing closed for no-data pixels', () => {
    // ARRANGE
    const rgba = new Uint8ClampedArray([
      128, 85, 255, 255,
      255, 255, 0, 255,
    ]);

    // ACT
    const tile = decodeSentinel1Backscatter(rgba, 2, 1);

    // ASSERT
    expect(Array.from(tile.dataMask)).toEqual([1, 0]);
    expect(tile.vvDb[0]).toBeCloseTo(-19.92, 1);
    expect(tile.vhDb[0]).toBeCloseTo(-30, 1);
  });

  it('should render candidates distinctly while keeping rejected surfaces dark', () => {
    // ARRANGE
    const classes = Uint8Array.from([
      OilSpillClass.NonTarget,
      OilSpillClass.Water,
      OilSpillClass.Candidate,
    ]);

    // ACT
    const rgba = renderOilSpillClasses(classes);

    // ASSERT
    expect(Array.from(rgba)).toEqual([
      4, 5, 6, 219,
      3, 11, 17, 97,
      240, 68, 68, 242,
    ]);
  });
});
