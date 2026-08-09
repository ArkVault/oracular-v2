import * as React from 'react';
import L, { type Coords } from 'leaflet';
import { useMap } from 'react-leaflet';

import { appConfig } from '@/app/config';
import {
  buildSentinel1BackscatterTileUrl,
  decodeSentinel1Backscatter,
  renderOilSpillClasses,
} from '@/features/oil-spill/adapters/sentinel1-wms-tile';
import { screenContextualOilSpill } from '@/features/oil-spill/domain/contextual-oil-screening';

const TILE_SIZE = 256;
const CONTEXT_BUFFER = 12;
const WEB_MERCATOR_LIMIT = 20_037_508.342789244;

interface ContextualOilSpillLayerProps {
  layerKey: string;
  onLoadingChange: (isLoading: boolean) => void;
  selectedAcquisitionDate?: string;
}

function bufferedTileBounds(coords: Coords): [number, number, number, number] {
  const tileSpan = (WEB_MERCATOR_LIMIT * 2) / 2 ** coords.z;
  const bufferSpan = tileSpan * (CONTEXT_BUFFER / TILE_SIZE);
  const minimumX = -WEB_MERCATOR_LIMIT + coords.x * tileSpan - bufferSpan;
  const maximumX = minimumX + tileSpan + bufferSpan * 2;
  const maximumY = WEB_MERCATOR_LIMIT - coords.y * tileSpan + bufferSpan;
  const minimumY = maximumY - tileSpan - bufferSpan * 2;
  return [minimumX, minimumY, maximumX, maximumY];
}

function cropBufferedRgba(source: Uint8ClampedArray): Uint8ClampedArray {
  const bufferedSize = TILE_SIZE + CONTEXT_BUFFER * 2;
  const target = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
  for (let row = 0; row < TILE_SIZE; row += 1) {
    const sourceStart = ((row + CONTEXT_BUFFER) * bufferedSize + CONTEXT_BUFFER) * 4;
    target.set(
      source.subarray(sourceStart, sourceStart + TILE_SIZE * 4),
      row * TILE_SIZE * 4,
    );
  }
  return target;
}

async function renderContextualTile(
  canvas: HTMLCanvasElement,
  coords: Coords,
  selectedAcquisitionDate: string | undefined,
  signal: AbortSignal,
) {
  const bufferedSize = TILE_SIZE + CONTEXT_BUFFER * 2;
  const url = buildSentinel1BackscatterTileUrl({
    bbox: bufferedTileBounds(coords),
    height: bufferedSize,
    selectedDate: selectedAcquisitionDate,
    width: bufferedSize,
    wmsUrl: appConfig.copernicusWmsUrl,
  });
  const response = await fetch(url, {
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal,
  });
  if (!response.ok) throw new Error(`Sentinel-1 tile request failed (${response.status})`);

  const image = await createImageBitmap(await response.blob());
  try {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = bufferedSize;
    sourceCanvas.height = bufferedSize;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const targetContext = canvas.getContext('2d');
    if (!sourceContext || !targetContext) throw new Error('Canvas 2D is unavailable');

    sourceContext.drawImage(image, 0, 0);
    const sourceRgba = sourceContext.getImageData(0, 0, bufferedSize, bufferedSize).data;
    const backscatter = decodeSentinel1Backscatter(sourceRgba, bufferedSize, bufferedSize);
    const classes = screenContextualOilSpill(backscatter);
    const rendered = cropBufferedRgba(renderOilSpillClasses(classes));
    const imageData = targetContext.createImageData(TILE_SIZE, TILE_SIZE);
    imageData.data.set(rendered);
    targetContext.putImageData(imageData, 0, 0);
  } finally {
    image.close();
  }
}

export function ContextualOilSpillLayer({
  layerKey,
  onLoadingChange,
  selectedAcquisitionDate,
}: ContextualOilSpillLayerProps) {
  const map = useMap();

  React.useEffect(() => {
    const controllers = new Set<AbortController>();
    const layer = new (class extends L.GridLayer {
      public override createTile(coords: Coords, done: L.DoneCallback): HTMLElement {
        const canvas = document.createElement('canvas');
        canvas.width = TILE_SIZE;
        canvas.height = TILE_SIZE;
        const controller = new AbortController();
        controllers.add(controller);
        void renderContextualTile(canvas, coords, selectedAcquisitionDate, controller.signal)
          .then(() => done(undefined, canvas))
          .catch((error: unknown) => {
            if (!controller.signal.aborted) {
              console.error('Contextual Sentinel-1 tile failed', error);
              done(error instanceof Error ? error : new Error('SAR tile failed'), canvas);
            }
          })
          .finally(() => controllers.delete(controller));
        return canvas;
      }
    })({ keepBuffer: 0, opacity: 0, tileSize: TILE_SIZE });
    layer.on('loading', () => {
      layer.setOpacity(0);
      onLoadingChange(true);
    });
    layer.on('load', () => {
      layer.setOpacity(1);
      onLoadingChange(false);
    });
    layer.addTo(map);

    return () => {
      controllers.forEach((controller) => controller.abort());
      layer.removeFrom(map);
    };
  }, [layerKey, map, onLoadingChange, selectedAcquisitionDate]);

  return null;
}
