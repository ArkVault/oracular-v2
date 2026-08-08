import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

const evalscriptPath = path.resolve(
  process.cwd(),
  'sentinel-hub/evalscripts/sargassum-sar-screening.js',
);

describe('Sentinel-1 coastal Sargassum SAR screening evalscript', () => {
  it('should reject land and keep river-like dark water out of the positive-contrast class', () => {
    // ARRANGE
    const source = readFileSync(evalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ setup, evaluatePixel })`,
      { Math },
    ) as {
      setup: () => unknown;
      evaluatePixel: (sample: Record<string, number>) => number[];
    };
    const darkWater = {
      VV: 0.0158,
      VH: 0.005,
      dataMask: 1,
    };

    // ACT + ASSERT
    expect(evalscript.setup()).toEqual({
      input: [{ bands: ['VV', 'VH', 'dataMask'], units: 'LINEAR_POWER' }],
      output: { bands: 4 },
    });
    expect(evalscript.evaluatePixel({ ...darkWater, dataMask: 0 }))
      .toEqual([0, 0, 0, 0]);
    expect(evalscript.evaluatePixel({
      VV: 0.2,
      VH: 0.08,
      dataMask: 1,
    })).toEqual([0.015, 0.018, 0.022, 0.88]);
    expect(evalscript.evaluatePixel({
      VV: 0.1,
      VH: 0.03,
      dataMask: 1,
    })).toEqual([0.015, 0.018, 0.022, 0.88]);
    expect(evalscript.evaluatePixel(darkWater))
      .toEqual([0.008, 0.035, 0.055, 0.36]);
    expect(evalscript.evaluatePixel({
      VV: 0.025,
      VH: 0.005,
      dataMask: 1,
    })).toEqual([0.015, 0.018, 0.022, 0.88]);
    expect(evalscript.evaluatePixel({
      VV: 0.02,
      VH: 0.015,
      dataMask: 1,
    })).toEqual([0.015, 0.018, 0.022, 0.88]);
    const candidate = evalscript.evaluatePixel({
      VV: 0.015,
      VH: 0.008,
      dataMask: 1,
    });
    expect(candidate[0]).toBeGreaterThan(0.9);
    expect(candidate[1]).toBeLessThan(0.7);
    expect(candidate[3]).toBe(0.95);
  });
});
