import * as React from 'react';
import type L from 'leaflet';

import type { FeatureInfoProvider } from '@/features/analysis/ports/feature-info-provider';
import {
  createAnalysisPointInfo,
  createNaturalColorPointInfo,
  createPointInfoError,
} from '../create-point-info';
import { createFeatureInfoViewport } from '../create-feature-info-viewport';
import type { IndicatorDefinition } from '../indicator-definitions';
import type { PointInfoData } from '../PointInfoSection';

interface UsePointAnalysisOptions {
  mapRef: React.MutableRefObject<L.Map | null>;
  provider: FeatureInfoProvider;
  selectedAcquisitionDate?: string;
  selectedIndicator: IndicatorDefinition;
  selectedLayer: string;
}

export function usePointAnalysis({
  mapRef,
  provider,
  selectedAcquisitionDate,
  selectedIndicator,
  selectedLayer,
}: UsePointAnalysisOptions) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [pointInfo, setPointInfo] = React.useState<PointInfoData | null>(null);

  const clear = React.useCallback(() => setPointInfo(null), []);

  const analyze = React.useCallback(async (event: L.LeafletMouseEvent) => {
    const point = { lat: event.latlng.lat, lng: event.latlng.lng };

    if (selectedIndicator.type === 'natural') {
      setPointInfo(createNaturalColorPointInfo(point));
      return;
    }

    if (!selectedLayer) {
      setPointInfo(null);
      return;
    }

    setIsLoading(true);
    try {
      const timeRange = selectedAcquisitionDate
        ? {
            from: new Date(`${selectedAcquisitionDate}T00:00:00.000Z`),
            to: new Date(`${selectedAcquisitionDate}T23:59:59.999Z`),
          }
        : undefined;
      const viewport = mapRef.current
        ? createFeatureInfoViewport(mapRef.current, event)
        : undefined;
      const result = await provider.get({
        layer: selectedLayer,
        point,
        ...(viewport ? { viewport } : {}),
        maxCloudCoverage: 10,
        ...(timeRange ? { timeRange } : {}),
      });

      setPointInfo(createAnalysisPointInfo(result, point, selectedLayer));
    } catch (analysisError) {
      console.error('Error fetching pixel info:', analysisError);
      setPointInfo(createPointInfoError(point));
    } finally {
      setIsLoading(false);
    }
  }, [mapRef, provider, selectedAcquisitionDate, selectedIndicator, selectedLayer]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on('click', analyze);
    return () => {
      map.off('click', analyze);
    };
  }, [analyze, mapRef]);

  return {
    clear,
    isLoading,
    pointInfo,
  };
}
