const DEFAULT_COPERNICUS_WMS_URL =
  'https://sh.dataspace.copernicus.eu/ogc/wms/fd8fbb51-cfdf-460d-9839-6dc55ee39ffa';
const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DEFAULT_BASEMAP_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export interface PublicAppConfig {
  copernicusWmsUrl: string;
  placeSearchUrl: string;
  basemapTileUrl: string;
  placeSearchLimit: number;
  indicatorLoadingDelayMs: number;
}

export interface PublicEnvironment {
  VITE_COPERNICUS_WMS_URL?: string;
  VITE_NOMINATIM_URL?: string;
  VITE_BASEMAP_TILE_URL?: string;
}

function readHttpUrl(name: string, value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must be an HTTP(S) URL`);
  }

  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLocalhost) {
    throw new Error(`${name} must use HTTPS outside localhost`);
  }

  return value;
}

export function createPublicAppConfig(
  environment?: PublicEnvironment,
): PublicAppConfig {
  const publicEnvironment = environment ?? (import.meta.env as unknown as PublicEnvironment);

  return {
    copernicusWmsUrl: readHttpUrl(
      'VITE_COPERNICUS_WMS_URL',
      publicEnvironment.VITE_COPERNICUS_WMS_URL?.trim() || DEFAULT_COPERNICUS_WMS_URL,
    ),
    placeSearchUrl: readHttpUrl(
      'VITE_NOMINATIM_URL',
      publicEnvironment.VITE_NOMINATIM_URL?.trim() || DEFAULT_NOMINATIM_URL,
    ),
    basemapTileUrl: readHttpUrl(
      'VITE_BASEMAP_TILE_URL',
      publicEnvironment.VITE_BASEMAP_TILE_URL?.trim() || DEFAULT_BASEMAP_TILE_URL,
    ),
    placeSearchLimit: 5,
    indicatorLoadingDelayMs: 3_000,
  };
}

export const appConfig = createPublicAppConfig();
