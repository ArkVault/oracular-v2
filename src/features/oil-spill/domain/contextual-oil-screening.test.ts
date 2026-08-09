import { describe, expect, it } from 'vitest';

import {
  OilSpillClass,
  screenContextualOilSpill,
  type SarBackscatterTile,
} from './contextual-oil-screening';

function tileFromRows(vvRows: number[][], vhRows: number[][]): SarBackscatterTile {
  const height = vvRows.length;
  const width = vvRows[0]?.length ?? 0;

  return {
    width,
    height,
    vvDb: Float32Array.from(vvRows.flat()),
    vhDb: Float32Array.from(vhRows.flat()),
    dataMask: Uint8Array.from({ length: width * height }, () => 1),
  };
}

const BRIGHT_NON_WATER = -8;
const CLEAN_WATER_VV = -18;
const CLEAN_WATER_VH = -25;
const OIL_LIKE_VV = -28;

describe('contextual Sentinel-1 oil-spill screening', () => {
  it('should reject an isolated dark pocket when it is not connected to marine water', () => {
    // ARRANGE
    const vvRows = Array.from({ length: 9 }, () => Array(9).fill(BRIGHT_NON_WATER));
    const vhRows = Array.from({ length: 9 }, () => Array(9).fill(BRIGHT_NON_WATER));
    vvRows[4]![4] = OIL_LIKE_VV;
    vhRows[4]![4] = -30;
    const tile = tileFromRows(vvRows, vhRows);

    // ACT
    const result = screenContextualOilSpill(tile, {
      backgroundRadius: 3,
      guardRadius: 1,
      minimumBackgroundSamples: 4,
    });

    // ASSERT
    expect(result[4 * tile.width + 4]).toBe(OilSpillClass.NonTarget);
  });

  it('should keep uniformly dark connected water as background instead of a spill candidate', () => {
    // ARRANGE
    const tile = tileFromRows(
      Array.from({ length: 9 }, () => Array(9).fill(-27)),
      Array.from({ length: 9 }, () => Array(9).fill(-30)),
    );

    // ACT
    const result = screenContextualOilSpill(tile, {
      backgroundRadius: 3,
      guardRadius: 1,
      minimumBackgroundSamples: 8,
    });

    // ASSERT
    expect(Array.from(result)).toEqual(
      Array.from({ length: 81 }, () => OilSpillClass.Water),
    );
  });

  it('should highlight a VV dark anomaly only when it contrasts with connected water', () => {
    // ARRANGE
    const vvRows = Array.from({ length: 9 }, () => Array(9).fill(CLEAN_WATER_VV));
    const vhRows = Array.from({ length: 9 }, () => Array(9).fill(CLEAN_WATER_VH));
    vvRows[4]![4] = OIL_LIKE_VV;
    vhRows[4]![4] = -30;
    const tile = tileFromRows(vvRows, vhRows);

    // ACT
    const result = screenContextualOilSpill(tile, {
      backgroundRadius: 3,
      guardRadius: 1,
      minimumBackgroundSamples: 8,
    });

    // ASSERT
    expect(result[4 * tile.width + 4]).toBe(OilSpillClass.Candidate);
  });

  it('should fail closed when Sentinel-1 pixels are outside the data mask', () => {
    // ARRANGE
    const tile = tileFromRows([[OIL_LIKE_VV]], [[-30]]);
    tile.dataMask[0] = 0;

    // ACT
    const result = screenContextualOilSpill(tile);

    // ASSERT
    expect(result[0]).toBe(OilSpillClass.NonTarget);
  });
});
