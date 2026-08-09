import sentinel1BackscatterEvalscript from '../../../../sentinel-hub/evalscripts/oil-spill-sar-source.js?raw';

import type { SarBackscatterTile } from '../domain/contextual-oil-screening';

const VV_MINIMUM_DB = -40;
const VH_MINIMUM_DB = -45;

interface Sentinel1BackscatterTileRequest {
  bbox: [number, number, number, number];
  height: number;
  selectedDate?: string;
  width: number;
  wmsUrl: string;
}

function encodeEvalscript(evalscript: string): string {
  const bytes = new TextEncoder().encode(evalscript);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildSentinel1BackscatterTileUrl({
  bbox,
  height,
  selectedDate,
  width,
  wmsUrl,
}: Sentinel1BackscatterTileRequest): string {
  const url = new URL(wmsUrl);
  url.search = new URLSearchParams({
    BBOX: bbox.join(','),
    CRS: 'EPSG:3857',
    EVALSCRIPT: encodeEvalscript(sentinel1BackscatterEvalscript),
    FORMAT: 'image/png',
    HEIGHT: String(height),
    LAYERS: 'INFRAR',
    REQUEST: 'GetMap',
    SERVICE: 'WMS',
    TRANSPARENT: 'true',
    VERSION: '1.3.0',
    WIDTH: String(width),
    ...(selectedDate
      ? { TIME: `${selectedDate}T00:00:00Z/${selectedDate}T23:59:59Z` }
      : {}),
  }).toString();
  return url.toString();
}

function decodeDb(channel: number, minimumDb: number): number {
  return minimumDb + (channel / 255) * -minimumDb;
}

export function decodeSentinel1Backscatter(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): SarBackscatterTile {
  const pixelCount = width * height;
  if (rgba.length !== pixelCount * 4) {
    throw new Error('Invalid Sentinel-1 RGBA tile');
  }
  const vvDb = new Float32Array(pixelCount);
  const vhDb = new Float32Array(pixelCount);
  const dataMask = new Uint8Array(pixelCount);

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    vvDb[index] = decodeDb(rgba[offset]!, VV_MINIMUM_DB);
    vhDb[index] = decodeDb(rgba[offset + 1]!, VH_MINIMUM_DB);
    dataMask[index] = rgba[offset + 2]! >= 128 && rgba[offset + 3]! > 0 ? 1 : 0;
  }

  return { dataMask, height, vhDb, vvDb, width };
}

const CLASS_COLORS: ReadonlyArray<readonly [number, number, number, number]> = [
  [4, 5, 6, 219],
  [3, 11, 17, 97],
  [240, 68, 68, 242],
];

export function renderOilSpillClasses(classes: Uint8Array): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(classes.length * 4);
  classes.forEach((classification, index) => {
    const color = CLASS_COLORS[classification] ?? CLASS_COLORS[0]!;
    rgba.set(color, index * 4);
  });
  return rgba;
}
