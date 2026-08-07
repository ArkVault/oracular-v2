import * as React from 'react';
import type L from 'leaflet';

import type { FeatureInfoProvider } from '@/features/analysis/ports/feature-info-provider';
import { classifyWaterQuality } from '@/features/analysis/domain/quality';

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
    if (selectedIndicator.type === 'natural') {
      setPointInfo({
        value: null,
        quality: 'Unknown',
        coordinates: [event.latlng.lat, event.latlng.lng],
        message: 'Please select a water quality parameter to view point values',
      });
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
        point: { lat: event.latlng.lat, lng: event.latlng.lng },
        ...(viewport ? { viewport } : {}),
        maxCloudCoverage: 10,
        ...(timeRange ? { timeRange } : {}),
      });

      setPointInfo({
        value: result.value,
        ...(result.valueSource ? { valueSource: result.valueSource } : {}),
        ...(result.isOutOfArea ? { isOutOfArea: true } : {}),
        quality:
          result.value === null
            ? 'Unknown'
            : classifyWaterQuality(result.value, selectedLayer),
        coordinates: [event.latlng.lat, event.latlng.lng],
        ...(result.message ? { message: result.message } : {}),
        ...(result.acquisitionId ? { acquisitionId: result.acquisitionId } : {}),
        ...(result.acquisitionDate ? { acquisitionDate: result.acquisitionDate } : {}),
        ...(result.cloudCoverage !== undefined
          ? { cloudCoverage: result.cloudCoverage }
          : {}),
      });
    } catch (analysisError) {
      console.error('Error fetching pixel info:', analysisError);
      setPointInfo({
        value: null,
        quality: 'Unknown',
        coordinates: [event.latlng.lat, event.latlng.lng],
        message: 'Unable to load a real Copernicus value for this point.',
      });
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
