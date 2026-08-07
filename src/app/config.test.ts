import { describe, expect, it } from 'vitest';

import { createPublicAppConfig } from './config';

describe('createPublicAppConfig', () => {
  it('should use explicit public provider URLs when environment overrides are present', () => {
    // ARRANGE
    const environment = {
      VITE_COPERNICUS_WMS_URL: 'https://copernicus.example.test/ogc/wms/demo',
      VITE_NOMINATIM_URL: 'https://search.example.test/search',
      VITE_BASEMAP_TILE_URL: 'https://tiles.example.test/{z}/{x}/{y}.png',
    };

    // ACT
    const config = createPublicAppConfig(environment);

    // ASSERT
    expect(config).toMatchObject({
      copernicusWmsUrl: environment.VITE_COPERNICUS_WMS_URL,
      placeSearchUrl: environment.VITE_NOMINATIM_URL,
      basemapTileUrl: environment.VITE_BASEMAP_TILE_URL,
    });
  });

  it('should reject non-http provider URLs before adapters are composed', () => {
    // ARRANGE
    const environment = {
      VITE_COPERNICUS_WMS_URL: 'javascript:alert(1)',
    };

    // ACT + ASSERT
    expect(() => createPublicAppConfig(environment)).toThrow(
      'VITE_COPERNICUS_WMS_URL must be an HTTP(S) URL',
    );
  });
});
