import { act, renderHook, waitFor } from '@testing-library/react';
import type L from 'leaflet';
import type { MutableRefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AcquisitionDateProvider } from '@/features/acquisitions/ports/acquisition-date-provider';

import { useAcquisitionDates } from './use-acquisition-dates';

describe('useAcquisitionDates', () => {
  it('should reload acquisitions for the visible bounds after the map moves', async () => {
    // ARRANGE
    let visibleBounds = {
      south: 21.45,
      west: -87.55,
      north: 21.65,
      east: -87.2,
    };
    const mapHandlers = new Map<string, () => void>();
    const map = {
      getBounds: vi.fn(() => ({
        getSouth: () => visibleBounds.south,
        getWest: () => visibleBounds.west,
        getNorth: () => visibleBounds.north,
        getEast: () => visibleBounds.east,
      })),
      on: vi.fn((event: string, handler: () => void) => {
        mapHandlers.set(event, handler);
      }),
      off: vi.fn((event: string) => {
        mapHandlers.delete(event);
      }),
    };
    const list = vi.fn()
      .mockResolvedValueOnce([{
        acquisitionId: 'scene-holbox',
        acquiredAt: '2026-08-07T11:43:40.000Z',
        cloudCoverage: 0,
        date: '2026-08-07',
      }])
      .mockResolvedValueOnce([{
        acquisitionId: 'scene-cancun',
        acquiredAt: '2026-08-02T11:35:09.000Z',
        cloudCoverage: 0,
        date: '2026-08-02',
      }]);
    const provider = { list } as AcquisitionDateProvider;
    const mapRef = { current: map as unknown as L.Map } as MutableRefObject<L.Map | null>;
    const { result, unmount } = renderHook(() => useAcquisitionDates({
      center: [21.52324, -87.37781],
      collection: 'sentinel-1',
      mapRef,
      provider,
    }));

    await waitFor(() => expect(result.current.selectedDate).toBe('2026-08-07'));
    expect(list).toHaveBeenCalledTimes(1);

    // ACT
    visibleBounds = {
      south: 21.0,
      west: -86.95,
      north: 21.35,
      east: -86.55,
    };
    act(() => mapHandlers.get('moveend')?.());

    // ASSERT
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({
      bounds: visibleBounds,
      collection: 'sentinel-1',
    }));
    await waitFor(() => expect(result.current.selectedDate).toBe('2026-08-02'));

    unmount();
    expect(map.off).toHaveBeenCalledWith('moveend', expect.any(Function));
  });
});
