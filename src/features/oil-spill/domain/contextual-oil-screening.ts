export const OilSpillClass = {
  NonTarget: 0,
  Water: 1,
  Candidate: 2,
} as const;

export type OilSpillClassValue = typeof OilSpillClass[keyof typeof OilSpillClass];

export interface SarBackscatterTile {
  dataMask: Uint8Array;
  height: number;
  vhDb: Float32Array;
  vvDb: Float32Array;
  width: number;
}

export interface ContextualOilScreeningOptions {
  backgroundRadius?: number;
  falseAlarmZScore?: number;
  guardRadius?: number;
  minimumBackgroundSamples?: number;
  oilLikeVvThresholdDb?: number;
  waterMaxVhDb?: number;
  waterMaxVvDb?: number;
}

const DEFAULT_OPTIONS = {
  backgroundRadius: 12,
  falseAlarmZScore: 2.326,
  guardRadius: 3,
  minimumBackgroundSamples: 40,
  oilLikeVvThresholdDb: -25,
  waterMaxVhDb: -22.9,
  waterMaxVvDb: -15,
};

function assertTile(tile: SarBackscatterTile) {
  const pixelCount = tile.width * tile.height;
  if (
    !Number.isInteger(tile.width)
    || !Number.isInteger(tile.height)
    || tile.width <= 0
    || tile.height <= 0
    || tile.vvDb.length !== pixelCount
    || tile.vhDb.length !== pixelCount
    || tile.dataMask.length !== pixelCount
  ) {
    throw new Error('Invalid Sentinel-1 backscatter tile');
  }
}

function connectedMarineWater(
  tile: SarBackscatterTile,
  waterMaxVvDb: number,
  waterMaxVhDb: number,
): Uint8Array {
  const { dataMask, height, vhDb, vvDb, width } = tile;
  const water = Uint8Array.from({ length: width * height }, (_, index) => (
    dataMask[index] === 1
    && Number.isFinite(vvDb[index])
    && Number.isFinite(vhDb[index])
    && vvDb[index]! <= waterMaxVvDb
    && vhDb[index]! <= waterMaxVhDb
      ? 1
      : 0
  ));
  const connected = new Uint8Array(water.length);
  const queue = new Int32Array(water.length);
  let queueStart = 0;
  let queueEnd = 0;

  const enqueue = (index: number) => {
    if (water[index] !== 1 || connected[index] === 1) return;
    connected[index] = 1;
    queue[queueEnd] = index;
    queueEnd += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const index = queue[queueStart]!;
    queueStart += 1;
    const x = index % width;
    const y = Math.floor(index / width);

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (offsetX === 0 && offsetY === 0) continue;
        const neighborX = x + offsetX;
        const neighborY = y + offsetY;
        if (
          neighborX >= 0
          && neighborX < width
          && neighborY >= 0
          && neighborY < height
        ) {
          enqueue(neighborY * width + neighborX);
        }
      }
    }
  }

  return connected;
}

interface BackgroundIntegrals {
  count: Uint32Array;
  height: number;
  sum: Float64Array;
  sumSquared: Float64Array;
  width: number;
}

function buildBackgroundIntegrals(
  tile: SarBackscatterTile,
  marineWater: Uint8Array,
): BackgroundIntegrals {
  const integralWidth = tile.width + 1;
  const integralHeight = tile.height + 1;
  const sum = new Float64Array(integralWidth * integralHeight);
  const sumSquared = new Float64Array(integralWidth * integralHeight);
  const count = new Uint32Array(integralWidth * integralHeight);

  for (let y = 1; y < integralHeight; y += 1) {
    for (let x = 1; x < integralWidth; x += 1) {
      const sourceIndex = (y - 1) * tile.width + x - 1;
      const targetIndex = y * integralWidth + x;
      const left = targetIndex - 1;
      const above = targetIndex - integralWidth;
      const aboveLeft = above - 1;
      const isWater = marineWater[sourceIndex] === 1;
      const value = isWater ? tile.vvDb[sourceIndex]! : 0;

      sum[targetIndex] = value + sum[left]! + sum[above]! - sum[aboveLeft]!;
      sumSquared[targetIndex] = value ** 2
        + sumSquared[left]!
        + sumSquared[above]!
        - sumSquared[aboveLeft]!;
      count[targetIndex] = (isWater ? 1 : 0)
        + count[left]!
        + count[above]!
        - count[aboveLeft]!;
    }
  }

  return { count, height: integralHeight, sum, sumSquared, width: integralWidth };
}

function rectangleValue(
  integral: Float64Array | Uint32Array,
  integralWidth: number,
  minimumX: number,
  minimumY: number,
  maximumX: number,
  maximumY: number,
): number {
  const left = minimumX;
  const top = minimumY;
  const right = maximumX + 1;
  const bottom = maximumY + 1;
  return integral[bottom * integralWidth + right]!
    - integral[top * integralWidth + right]!
    - integral[bottom * integralWidth + left]!
    + integral[top * integralWidth + left]!;
}

function isContextualDarkAnomaly(
  tile: SarBackscatterTile,
  integrals: BackgroundIntegrals,
  x: number,
  y: number,
  backgroundRadius: number,
  guardRadius: number,
  minimumBackgroundSamples: number,
  falseAlarmZScore: number,
): boolean {
  const minimumX = Math.max(0, x - backgroundRadius);
  const maximumX = Math.min(tile.width - 1, x + backgroundRadius);
  const minimumY = Math.max(0, y - backgroundRadius);
  const maximumY = Math.min(tile.height - 1, y + backgroundRadius);
  const guardMinimumX = Math.max(0, x - guardRadius);
  const guardMaximumX = Math.min(tile.width - 1, x + guardRadius);
  const guardMinimumY = Math.max(0, y - guardRadius);
  const guardMaximumY = Math.min(tile.height - 1, y + guardRadius);
  const outerCount = rectangleValue(
    integrals.count,
    integrals.width,
    minimumX,
    minimumY,
    maximumX,
    maximumY,
  );
  const guardCount = rectangleValue(
    integrals.count,
    integrals.width,
    guardMinimumX,
    guardMinimumY,
    guardMaximumX,
    guardMaximumY,
  );
  const sampleCount = outerCount - guardCount;
  if (sampleCount < minimumBackgroundSamples) return false;
  const sum = rectangleValue(
    integrals.sum,
    integrals.width,
    minimumX,
    minimumY,
    maximumX,
    maximumY,
  ) - rectangleValue(
    integrals.sum,
    integrals.width,
    guardMinimumX,
    guardMinimumY,
    guardMaximumX,
    guardMaximumY,
  );
  const sumSquared = rectangleValue(
    integrals.sumSquared,
    integrals.width,
    minimumX,
    minimumY,
    maximumX,
    maximumY,
  ) - rectangleValue(
    integrals.sumSquared,
    integrals.width,
    guardMinimumX,
    guardMinimumY,
    guardMaximumX,
    guardMaximumY,
  );
  const mean = sum / sampleCount;
  const variance = Math.max(0, sumSquared / sampleCount - mean ** 2);
  const threshold = mean - falseAlarmZScore * Math.sqrt(variance);
  return tile.vvDb[y * tile.width + x]! < threshold;
}

export function screenContextualOilSpill(
  tile: SarBackscatterTile,
  options: ContextualOilScreeningOptions = {},
): Uint8Array {
  assertTile(tile);
  const settings = { ...DEFAULT_OPTIONS, ...options };
  if (settings.guardRadius >= settings.backgroundRadius) {
    throw new Error('CFAR guard radius must be smaller than the background radius');
  }

  const marineWater = connectedMarineWater(
    tile,
    settings.waterMaxVvDb,
    settings.waterMaxVhDb,
  );
  const integrals = buildBackgroundIntegrals(tile, marineWater);
  const result = Uint8Array.from(marineWater, (value) => (
    value === 1 ? OilSpillClass.Water : OilSpillClass.NonTarget
  ));

  for (let y = 0; y < tile.height; y += 1) {
    for (let x = 0; x < tile.width; x += 1) {
      const index = y * tile.width + x;
      if (
        marineWater[index] !== 1
        || tile.vvDb[index]! > settings.oilLikeVvThresholdDb
      ) {
        continue;
      }
      if (isContextualDarkAnomaly(
        tile,
        integrals,
        x,
        y,
        settings.backgroundRadius,
        settings.guardRadius,
        settings.minimumBackgroundSamples,
        settings.falseAlarmZScore,
      )) {
        result[index] = OilSpillClass.Candidate;
      }
    }
  }

  return result;
}
