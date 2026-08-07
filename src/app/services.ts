import { CopernicusWfsAcquisitionDateProvider } from '@/features/acquisitions/adapters/copernicus-wfs-acquisition-dates';
import type { AcquisitionDateProvider } from '@/features/acquisitions/ports/acquisition-date-provider';
import { CopernicusWmsFeatureInfoProvider } from '@/features/analysis/adapters/copernicus-wms-feature-info';
import type { FeatureInfoProvider } from '@/features/analysis/ports/feature-info-provider';
import { NominatimPlaceSearchProvider } from '@/features/place-search/adapters/nominatim-place-search';
import type { PlaceSearchProvider } from '@/features/place-search/ports/place-search-provider';

import { appConfig, type PublicAppConfig } from './config';

export interface AppServices {
  acquisitionDates: AcquisitionDateProvider;
  featureInfo: FeatureInfoProvider;
  placeSearch: PlaceSearchProvider;
}

export function createAppServices(config: PublicAppConfig = appConfig): AppServices {
  return {
    acquisitionDates: new CopernicusWfsAcquisitionDateProvider(config.copernicusWmsUrl),
    featureInfo: new CopernicusWmsFeatureInfoProvider(config.copernicusWmsUrl),
    placeSearch: new NominatimPlaceSearchProvider(
      config.placeSearchUrl,
      undefined,
      config.placeSearchLimit,
    ),
  };
}

export const appServices = createAppServices();
