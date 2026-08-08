import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

const evalscriptPath = path.resolve(
  process.cwd(),
  'sentinel-hub/evalscripts/oil-spill-sar-screening.js',
);

describe('Sentinel-1 oil-spill screening evalscript', () => {
  it('should mask no-data and non-water before highlighting VV dark-return candidates', () => {
    // ARRANGE
    const source = readFileSync(evalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ setup, evaluatePixel })`,
      { Math },
    ) as {
      setup: () => unknown;
      evaluatePixel: (sample: Record<string, number>) => number[];
    };

    // ACT + ASSERT
    expect(evalscript.setup()).toEqual({
      input: [{ bands: ['VV', 'VH', 'dataMask'], units: 'LINEAR_POWER' }],
      output: { bands: 4 },
    });
    expect(evalscript.evaluatePixel({ VV: 0.0025, VH: 0.001, dataMask: 0 }))
      .toEqual([0, 0, 0, 0]);
    expect(evalscript.evaluatePixel({ VV: 0.2, VH: 0.08, dataMask: 1 }))
      .toEqual([0.015, 0.018, 0.022, 0.86]);
    expect(evalscript.evaluatePixel({ VV: 0.0631, VH: 0.01, dataMask: 1 }))
      .toEqual([0.015, 0.018, 0.022, 0.86]);
    expect(evalscript.evaluatePixel({ VV: 0.0158, VH: 0.005, dataMask: 1 }))
      .toEqual([0.012, 0.045, 0.065, 0.38]);
    expect(evalscript.evaluatePixel({ VV: 0.0025, VH: 0.001, dataMask: 1 }))
      .toEqual([0.94, 0.267, 0.267, 0.95]);
  });
});
