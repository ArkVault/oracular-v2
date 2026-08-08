import * as React from 'react';
import type L from 'leaflet';

import type {
  AcquisitionCollection,
  AcquisitionDate,
  AcquisitionDateProvider,
} from '@/features/acquisitions/ports/acquisition-date-provider';
import {
  acquisitionDateToLocalDate,
  toWmsDayTimeRange,
} from '@/features/acquisitions/domain/acquisition-date';
import { DEFAULT_MAX_CLOUD_COVERAGE } from '@/features/acquisitions/domain/cloud-coverage';

interface UseAcquisitionDatesOptions {
  center: [number, number];
  collection: AcquisitionCollection;
  mapRef: React.MutableRefObject<L.Map | null>;
  provider: AcquisitionDateProvider;
}

export function useAcquisitionDates({
  center,
  collection,
  mapRef,
  provider,
}: UseAcquisitionDatesOptions) {
  const centerLatitude = center[0];
  const centerLongitude = center[1];
  const activeCollectionRef = React.useRef(collection);
  const loadedCollectionRef = React.useRef<AcquisitionCollection | undefined>(undefined);
  const loadingCollectionRef = React.useRef<AcquisitionCollection | undefined>(undefined);
  const [selectedDate, setSelectedDate] = React.useState<string>();
  const [availableAcquisitions, setAvailableAcquisitions] = React.useState<AcquisitionDate[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [calendarMonth, setCalendarMonth] = React.useState(new Date());

  const availableDates = React.useMemo(
    () => availableAcquisitions.map((acquisition) => acquisition.date),
    [availableAcquisitions],
  );
  const availableDateSet = React.useMemo(
    () => new Set(availableDates),
    [availableDates],
  );
  const availableCalendarDates = React.useMemo(
    () => availableDates.map(acquisitionDateToLocalDate),
    [availableDates],
  );
  const selectedCalendarDate = selectedDate
    ? acquisitionDateToLocalDate(selectedDate)
    : undefined;
  const selectedTileTime = selectedDate
    ? toWmsDayTimeRange(selectedDate)
    : undefined;
  const selectedAcquisition = availableAcquisitions.find(
    (acquisition) => acquisition.date === selectedDate,
  );

  React.useEffect(() => {
    activeCollectionRef.current = collection;
  }, [collection]);

  const load = React.useCallback(async () => {
    if (
      loadedCollectionRef.current === collection
      || loadingCollectionRef.current === collection
    ) {
      return;
    }

    const bounds = mapRef.current?.getBounds();
    const to = new Date();
    const from = new Date(to);
    from.setUTCFullYear(to.getUTCFullYear() - 1);

    setIsLoading(true);
    loadingCollectionRef.current = collection;
    setError(undefined);
    try {
      const acquisitions = await provider.list({
        bounds: bounds
          ? {
              south: bounds.getSouth(),
              west: bounds.getWest(),
              north: bounds.getNorth(),
              east: bounds.getEast(),
            }
          : {
              south: centerLatitude - 0.15,
              west: centerLongitude - 0.15,
              north: centerLatitude + 0.15,
              east: centerLongitude + 0.15,
            },
        from,
        to,
        maxCloudCoverage: DEFAULT_MAX_CLOUD_COVERAGE,
        collection,
      });
      if (activeCollectionRef.current !== collection) {
        return;
      }
      const dates = acquisitions.map((acquisition) => acquisition.date);
      setAvailableAcquisitions(acquisitions);
      if (dates[0]) {
        setCalendarMonth(acquisitionDateToLocalDate(dates[0]));
      }
      setSelectedDate((current) =>
        current && dates.includes(current) ? current : dates[0],
      );
      loadedCollectionRef.current = collection;
    } catch (loadError) {
      if (activeCollectionRef.current !== collection) {
        return;
      }
      console.error('Error fetching Copernicus acquisition dates:', loadError);
      setAvailableAcquisitions([]);
      setError('Unable to load Copernicus dates for this area.');
    } finally {
      if (loadingCollectionRef.current === collection) {
        loadingCollectionRef.current = undefined;
      }
      if (activeCollectionRef.current === collection) {
        setIsLoading(false);
      }
    }
  }, [centerLatitude, centerLongitude, collection, mapRef, provider]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return {
    availableCalendarDates,
    availableDateSet,
    availableDates,
    calendarMonth,
    error,
    isLoading,
    load,
    selectedCalendarDate,
    selectedAcquisition,
    selectedDate,
    selectedTileTime,
    setCalendarMonth,
    setSelectedDate,
  };
}
