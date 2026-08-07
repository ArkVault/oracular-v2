import type L from 'leaflet';

import type { FeatureInfoViewport } from '@/features/analysis/domain/feature-info';

const WMS_TILE_SIZE = 256;

export function createFeatureInfoViewport(
  map: L.Map,
  event: L.LeafletMouseEvent,
): FeatureInfoViewport | undefined {
  if (!event.containerPoint) return undefined;

  const bounds = map.getBounds();
  const mapCrs = map.options.crs;

  if (mapCrs?.code === 'EPSG:3857') {
    const zoom = map.getZoom();
    const worldPixel = map.project(event.latlng, zoom);
    const tileColumn = Math.floor(worldPixel.x / WMS_TILE_SIZE);
    const tileRow = Math.floor(worldPixel.y / WMS_TILE_SIZE);
    const tileNorthWest = map.unproject(
      [tileColumn * WMS_TILE_SIZE, tileRow * WMS_TILE_SIZE],
      zoom,
    );
    const tileSouthEast = map.unproject(
      [(tileColumn + 1) * WMS_TILE_SIZE, (tileRow + 1) * WMS_TILE_SIZE],
      zoom,
    );
    const northWest = mapCrs.project(tileNorthWest);
    const southEast = mapCrs.project(tileSouthEast);

    return {
      crs: 'EPSG:3857',
      bounds: {
        south: southEast.y,
        west: northWest.x,
        north: northWest.y,
        east: southEast.x,
      },
      width: WMS_TILE_SIZE,
      height: WMS_TILE_SIZE,
      pixel: {
        x: worldPixel.x - tileColumn * WMS_TILE_SIZE,
        y: worldPixel.y - tileRow * WMS_TILE_SIZE,
      },
    };
  }

  const size = map.getSize();
  return {
    crs: 'EPSG:4326',
    bounds: {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    },
    width: size.x,
    height: size.y,
    pixel: { x: event.containerPoint.x, y: event.containerPoint.y },
  };
}
