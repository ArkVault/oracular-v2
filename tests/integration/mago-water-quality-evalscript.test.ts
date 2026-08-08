import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

interface MagoEvalscript {
  evaluatePixel: (sample: Record<string, number>) => {
    default: number[];
    index: number[];
    eobrowserStats: number[];
    dataMask: number[];
  };
  setup: () => {
    input: string[];
    output: Array<{ id: string; bands: number; sampleType?: string }>;
  };
}

const evalscriptPath = path.resolve(
  process.cwd(),
  'sentinel-hub/evalscripts/mago-water-quality-index-0.js',
);
const wmsEvalscriptPath = path.resolve(
  process.cwd(),
  'sentinel-hub/evalscripts/mago-water-quality-index-0-wms.js',
);
const cdomWmsEvalscriptPath = path.resolve(
  process.cwd(),
  'sentinel-hub/evalscripts/mago-water-quality-index-6-wms.js',
);
const turbidityWmsEvalscriptPath = path.resolve(
  process.cwd(),
  'sentinel-hub/evalscripts/mago-water-quality-index-5-wms.js',
);
const tssWmsEvalscriptPath = path.resolve(
  process.cwd(),
  'sentinel-hub/evalscripts/mago-water-quality-index-7-wms.js',
);

function loadEvalscript(): MagoEvalscript {
  const source = readFileSync(evalscriptPath, 'utf8');

  return runInNewContext(
    `${source}\n;({ setup, evaluatePixel })`,
    {
      Math,
      colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
      index: (left: number, right: number) => (left - right) / (left + right),
    },
  ) as MagoEvalscript;
}

const waterSample = {
  B01: 0.02,
  B02: 0.03,
  B03: 0.1,
  B04: 0.05,
  B05: 0.05,
  B06: 0.04,
  B07: 0.04,
  B08: 0.03,
  B11: 0.02,
  B12: 0.01,
  CLM: 0,
  SCL: 6,
  dataMask: 1,
};

describe('MAGO Water Quality evalscript contract', () => {
  it.each([
    {
      path: cdomWmsEvalscriptPath,
      formula: '2.4072 * (sample.B04 / sample.B02) + 0.0709',
      expectedInputs: ['B02', 'B03', 'B04', 'B08', 'B11', 'B12', 'CLM', 'dataMask'],
      expectedWater: [0, 1, 0, 1],
      expectedCloud: [0.02, 0.025, 0.03, 0.82],
      validSample: waterSample,
    },
    {
      path: turbidityWmsEvalscriptPath,
      formula: '194.79 * (sample.B05 * (sample.B05 / sample.B02)) + 0.9061',
      expectedInputs: ['B02', 'B03', 'B04', 'B05', 'B08', 'B11', 'B12', 'CLM', 'dataMask'],
      expectedWater: [234 / 255, 179 / 255, 8 / 255, 1],
      expectedCloud: [0.02, 0.025, 0.03, 0.82],
      validSample: { ...waterSample, B05: 0.04 },
    },
    {
      path: tssWmsEvalscriptPath,
      formula: '14.464 * ratio + 16.336',
      expectedInputs: ['B02', 'B03', 'B04', 'B07', 'B08', 'B11', 'B12', 'CLM', 'dataMask'],
      expectedWater: [0, 1, 0, 1],
      expectedCloud: [0.02, 0.025, 0.03, 0.82],
      validSample: waterSample,
    },
  ])('should provide a cloud- and water-masked WMS script for $path', ({
    path: scriptPath,
    formula,
    expectedInputs,
    expectedWater,
    expectedCloud,
    validSample,
  }) => {
    // ARRANGE
    const source = readFileSync(scriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ setup, evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'setup' | 'evaluatePixel'>;

    // ACT + ASSERT
    expect(evalscript.setup()).toEqual({ input: expectedInputs, output: { bands: 4 } });
    expect(evalscript.evaluatePixel(validSample)).toEqual(expectedWater);
    expect(evalscript.evaluatePixel({ ...validSample, CLM: 1 })).toEqual(expectedCloud);
    expect(source).toContain(formula);
  });

  it('should darken classified land in turbidity while preserving true no-data transparency', () => {
    // ARRANGE
    const source = readFileSync(turbidityWmsEvalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'evaluatePixel'>;

    // ACT + ASSERT
    expect(evalscript.evaluatePixel({
      ...waterSample,
      B03: 0.04,
      B08: 0.08,
    })).toEqual([0.02, 0.025, 0.03, 0.82]);
    expect(evalscript.evaluatePixel({ ...waterSample, dataMask: 0 })).toEqual([0, 0, 0, 0]);
  });

  it('should preserve a turbid water-edge pixel without strict index consensus', () => {
    // ARRANGE
    const source = readFileSync(turbidityWmsEvalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'evaluatePixel'>;
    const turbidWaterEdge = {
      ...waterSample,
      B02: 0.03,
      B03: 0.05,
      B04: 0.045,
      B05: 0.04,
      B08: 0.04,
      B11: 0.02,
      B12: 0.015,
    };

    // ACT + ASSERT
    expect(evalscript.evaluatePixel(turbidWaterEdge)).toEqual(
      [234 / 255, 179 / 255, 8 / 255, 1],
    );
  });

  it('should saturate high turbidity water at the top of the display scale', () => {
    // ARRANGE
    const source = readFileSync(turbidityWmsEvalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'evaluatePixel'>;
    const highTurbidityWater = {
      ...waterSample,
      B02: 0.03,
      B05: 0.09,
    };

    // ACT + ASSERT
    expect(evalscript.evaluatePixel(highTurbidityWater)).toEqual(
      [234 / 255, 179 / 255, 8 / 255, 1],
    );
  });

  it('should keep dark water with zero blue reflectance inside the display scale', () => {
    // ARRANGE
    const source = readFileSync(turbidityWmsEvalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'evaluatePixel'>;

    // ACT + ASSERT
    expect(evalscript.evaluatePixel({ ...waterSample, B02: 0 })).toEqual(
      [234 / 255, 179 / 255, 8 / 255, 1],
    );
  });

  it('should reject an urban or bare-soil WBM false positive', () => {
    // ARRANGE
    const source = readFileSync(turbidityWmsEvalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'evaluatePixel'>;
    const urbanOrBareSoil = {
      ...waterSample,
      B02: 0.05,
      B03: 0.06,
      B04: 0.05,
      B05: 0.04,
      B08: 0.03,
      B11: 0.1,
      B12: 0.08,
    };

    // ACT + ASSERT
    expect(evalscript.evaluatePixel(urbanOrBareSoil)).toEqual(
      [0.02, 0.025, 0.03, 0.82],
    );
  });

  it('should reject TSS pixels outside the published high-concentration ratio regime', () => {
    // ARRANGE
    const source = readFileSync(tssWmsEvalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'evaluatePixel'>;

    // ACT
    const result = evalscript.evaluatePixel({ ...waterSample, B07: 0.02, B02: 0.03 });

    // ASSERT
    expect(result).toEqual([0.02, 0.025, 0.03, 0.82]);
  });

  it('should provide a visualization-only script compatible with the configured WMS collection', () => {
    // ARRANGE + ACT
    const source = readFileSync(wmsEvalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ setup, evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'setup' | 'evaluatePixel'>;

    // ASSERT
    expect(evalscript.setup()).toEqual({
      input: ['B02', 'B03', 'B04', 'B05', 'B08', 'B11', 'B12', 'CLM', 'dataMask'],
      output: { bands: 4 },
    });
    expect(evalscript.evaluatePixel(waterSample)).toEqual([0, 1, 0, 1]);
    expect(source).toContain('14.039 + 86.11 * ndci');
    expect(source).not.toContain('"SCL"');
  });

  it('should darken clouds even when their spectral ratios resemble water', () => {
    // ARRANGE
    const source = readFileSync(wmsEvalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'evaluatePixel'>;

    // ACT
    const result = evalscript.evaluatePixel({ ...waterSample, CLM: 1 });

    // ASSERT
    expect(result).toEqual([0.02, 0.025, 0.03, 0.82]);
  });

  it('should darken non-water pixels when only NDWI passes', () => {
    // ARRANGE
    const source = readFileSync(wmsEvalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'evaluatePixel'>;

    // ACT
    const result = evalscript.evaluatePixel({
      ...waterSample,
      B03: 0.1,
      B08: 0.05,
      B11: 0.15,
    });

    // ASSERT
    expect(result).toEqual([0.02, 0.025, 0.03, 0.82]);
  });

  it('should keep true no-data transparent in the NDCI WMS visualization', () => {
    // ARRANGE
    const source = readFileSync(wmsEvalscriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'evaluatePixel'>;

    // ACT + ASSERT
    expect(evalscript.evaluatePixel({ ...waterSample, dataMask: 0 })).toEqual([0, 0, 0, 0]);
  });

  it.each([
    { path: wmsEvalscriptPath, sample: { ...waterSample, B05: 0.5 } },
    { path: cdomWmsEvalscriptPath, sample: { ...waterSample, B02: 0.005 } },
    { path: tssWmsEvalscriptPath, sample: { ...waterSample, B07: 0.2 } },
  ])('should darken a water pixel outside the parameter validity domain for $path', ({
    path: scriptPath,
    sample,
  }) => {
    // ARRANGE
    const source = readFileSync(scriptPath, 'utf8');
    const evalscript = runInNewContext(
      `${source}\n;({ evaluatePixel })`,
      {
        Math,
        colorBlend: (_value: number, _limits: number[], colors: number[][]) => colors[2],
        index: (left: number, right: number) => (left - right) / (left + right),
      },
    ) as Pick<MagoEvalscript, 'evaluatePixel'>;

    // ACT + ASSERT
    expect(evalscript.evaluatePixel(sample)).toEqual([0.02, 0.025, 0.03, 0.82]);
  });

  it('should expose a four-band visualization and a FLOAT32 scalar index', () => {
    // ARRANGE
    const evalscript = loadEvalscript();

    // ACT
    const contract = evalscript.setup();

    // ASSERT
    expect(contract.input).toEqual(expect.arrayContaining([
      'B02', 'B03', 'B04', 'B05', 'B08', 'B11', 'B12', 'SCL', 'dataMask',
    ]));
    expect(contract.output).toEqual(expect.arrayContaining([
      { id: 'default', bands: 4 },
      { id: 'index', bands: 1, sampleType: 'FLOAT32' },
      { id: 'dataMask', bands: 1 },
    ]));
  });

  it('should calculate MAGO index 0 for a valid water pixel', () => {
    // ARRANGE
    const evalscript = loadEvalscript();

    // ACT
    const result = evalscript.evaluatePixel(waterSample);

    // ASSERT
    expect(result.index[0]).toBeCloseTo(14.039, 6);
    expect(result.dataMask).toEqual([1]);
  });

  it('should not report a water-quality value for a non-water pixel', () => {
    // ARRANGE
    const evalscript = loadEvalscript();

    // ACT
    const result = evalscript.evaluatePixel({
      ...waterSample,
      B03: 0.04,
      B08: 0.08,
    });

    // ASSERT
    expect(Number.isNaN(result.index[0])).toBe(true);
  });

  it('should flag cloudy pixels in the EO Browser statistics output', () => {
    // ARRANGE
    const evalscript = loadEvalscript();

    // ACT
    const result = evalscript.evaluatePixel({ ...waterSample, SCL: 9 });

    // ASSERT
    expect(result.eobrowserStats[1]).toBe(1);
  });

  it('should suppress analytical values and visualization for cloudy L2A pixels', () => {
    // ARRANGE
    const evalscript = loadEvalscript();

    // ACT
    const result = evalscript.evaluatePixel({ ...waterSample, SCL: 9 });

    // ASSERT
    expect(Number.isNaN(result.index[0])).toBe(true);
    expect(result.default).toEqual([0, 0, 0, 0]);
  });
});
