import * as React from 'react';
import type L from 'leaflet';

import type { AcquisitionDateProvider } from '@/features/acquisitions/ports/acquisition-date-provider';
import {
  acquisitionDateToLocalDate,
  toWmsDayTimeRange,
} from '@/features/acquisitions/domain/acquisition-date';
import { DEFAULT_MAX_CLOUD_COVERAGE } from '@/features/acquisitions/domain/cloud-coverage';

interface UseAcquisitionDatesOptions {
  center: [number, number];
  mapRef: React.MutableRefObject<L.Map | null>;
  provider: AcquisitionDateProvider;
}

export function useAcquisitionDates({
  center,
  mapRef,
  provider,
}: UseAcquisitionDatesOptions) {
  const [selectedDate, setSelectedDate] = React.useState<string>();
  const [availableDates, setAvailableDates] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [calendarMonth, setCalendarMonth] = React.useState(new Date());

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

  const load = React.useCallback(async () => {
    const bounds = mapRef.current?.getBounds();
    const to = new Date();
    const from = new Date(to);
    from.setUTCFullYear(to.getUTCFullYear() - 1);

    setIsLoading(true);
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
              south: center[0] - 0.15,
              west: center[1] - 0.15,
              north: center[0] + 0.15,
              east: center[1] + 0.15,
            },
        from,
        to,
        maxCloudCoverage: DEFAULT_MAX_CLOUD_COVERAGE,
      });
      const dates = acquisitions.map((acquisition) => acquisition.date);
      setAvailableDates(dates);
      if (dates[0]) {
        setCalendarMonth(acquisitionDateToLocalDate(dates[0]));
      }
      setSelectedDate((current) =>
        current && dates.includes(current) ? current : undefined,
      );
    } catch (loadError) {
      console.error('Error fetching Copernicus acquisition dates:', loadError);
      setAvailableDates([]);
      setError('Unable to load Copernicus dates for this area.');
    } finally {
      setIsLoading(false);
    }
  }, [center, mapRef, provider]);

  return {
    availableCalendarDates,
    availableDateSet,
    availableDates,
    calendarMonth,
    error,
    isLoading,
    load,
    selectedCalendarDate,
    selectedDate,
    selectedTileTime,
    setCalendarMonth,
    setSelectedDate,
  };
}
