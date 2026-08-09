import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const evalscriptPath = resolve('sentinel-hub/evalscripts/chlorophyll-a-mci-wms.js');

describe('Ulyssys Chlorophyll-a MCI evalscript', () => {
  it('should render Sentinel-2 MCI without blending the TSS index', () => {
    // ARRANGE
    const evalscript = readFileSync(evalscriptPath, 'utf8');

    // ACT + ASSERT
    expect(evalscript).toContain('bands: ["B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B09", "B11", "CLM", "dataMask"]');
    expect(evalscript).toContain('sample.B05 - MCI_RED_WEIGHT * sample.B04');
    expect(evalscript).toContain('- MCI_RED_EDGE_WEIGHT * sample.B06');
    expect(evalscript).not.toContain('units: "REFLECTANCE"');
    expect(evalscript).not.toContain('tssIndex');
  });

  it('should preserve the published qualitative MCI domain, palette, and water mask', () => {
    // ARRANGE
    const evalscript = readFileSync(evalscriptPath, 'utf8');

    // ACT + ASSERT
    expect(evalscript).toContain('var MCI_MINIMUM = -0.005;');
    expect(evalscript).toContain('var MCI_MAXIMUM = 0.05;');
    expect(evalscript).toContain('[0.0034, 0.0142, 0.163]');
    expect(evalscript).toContain('[1, 0, 0]');
    expect(evalscript).toContain('ndwi >= 0 && isHollsteinPureWater(sample)');
    expect(evalscript).toContain('sample.CLM === 0');
    expect(evalscript).toContain('sample.dataMask !== 1');
  });
});
