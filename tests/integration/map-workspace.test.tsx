import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mapHarness = vi.hoisted(() => {
  const harness = {
    clickHandler: null as null | ((event: {
      latlng: { lat: number; lng: number };
      containerPoint?: { x: number; y: number };
    }) => Promise<void>),
    map: {} as Record<string, unknown>,
  };

  harness.map = {
    on: vi.fn((_event, handler) => {
      harness.clickHandler = handler;
    }),
    off: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    setView: vi.fn(),
    getBounds: vi.fn(() => ({
      getSouth: () => 20.15,
      getWest: () => -103.35,
      getNorth: () => 20.4,
      getEast: () => -103.05,
      getSouthWest: () => ({ lat: 20.15, lng: -103.35 }),
      getNorthEast: () => ({ lat: 20.4, lng: -103.05 }),
    })),
    getSize: vi.fn(() => ({ x: 1280, y: 720 })),
    getZoom: vi.fn(() => 12),
    project: vi.fn(() => ({ x: 981, y: 537 })),
    unproject: vi.fn(([x, y]: [number, number]) => ({
      lat: y === 512 ? 6 : 1,
      lng: x === 768 ? -14 : -5,
    })),
    options: {
      crs: {
        code: 'EPSG:3857',
        project: ({ lat, lng }: { lat: number; lng: number }) => ({
          x: lng * 1_000,
          y: lat * 1_000,
        }),
      },
    },
  };

  return harness;
});

vi.mock('react-leaflet', async () => {
  const React = await import('react');

  return {
    MapContainer: React.forwardRef(({ children }: { children: ReactNode }, ref) => {
      React.useImperativeHandle(ref, () => mapHarness.map);
      return <div data-testid="map-container">{children}</div>;
    }),
    TileLayer: () => <div data-testid="base-layer" />,
    WMSTileLayer: ({ layers, params }: { layers: string; params?: Record<string, string | number> }) => (
      <div
        data-testid="wms-layer"
        data-layers={layers}
        data-time={params?.TIME}
        data-maxcc={params?.MAXCC}
      />
    ),
  };
});

vi.mock('../../src/components/Map/DrawControl', () => ({
  DrawControl: () => <div data-testid="draw-control" />,
}));

import { Map } from '../../src/components/Map/Map';

describe('Map workspace integration', () => {
  beforeEach(() => {
    mapHarness.clickHandler = null;
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        text: async () => '<WMS_Capabilities />',
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should render the primary analysis controls', () => {
    // ARRANGE + ACT
    render(<Map />);

    // ASSERT
    expect(screen.getByRole('button', { name: 'Dates' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Dates' })).toHaveAttribute('data-slot', 'button');
    expect(screen.getByRole('button', { name: 'Sensors' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Search' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Account' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Chlorophyll-a' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Forest Fire Detection' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hide indicators' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Draw polygon' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Draw rectangle' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Clear drawings' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Select Area' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dashboard' })).toBeNull();
  });

  it('should defer drawing tools until the first drawing command', async () => {
    render(<Map />);

    expect(screen.queryByTestId('draw-control')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Draw polygon' }));

    expect(await screen.findByTestId('draw-control')).toBeVisible();
  });

  it('should expose the modular Oracular V2 navigation and keep overlays mutually exclusive', () => {
    // ARRANGE
    render(<Map />);

    // ACT + ASSERT
    expect(screen.getByRole('heading', { name: 'Oracular V2' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Search' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Dates' }));
    const datesDialog = screen.getByRole('dialog', { name: 'Available acquisition dates' });
    expect(datesDialog).toBeVisible();
    expect(datesDialog).toHaveAttribute('data-slot', 'card');

    fireEvent.click(screen.getByRole('button', { name: 'Sensors' }));
    expect(screen.queryByRole('dialog', { name: 'Available acquisition dates' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Available sensors' })).toBeVisible();
  });

  it('should debounce place searches and send only the latest query', async () => {
    // ARRANGE
    vi.useFakeTimers();
    const placeSearch = vi.fn().mockResolvedValue([]);
    const services = {
      placeSearch: { search: placeSearch },
      acquisitionDates: { list: vi.fn().mockResolvedValue([]) },
      featureInfo: { get: vi.fn() },
    };
    render(<Map services={services} />);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    const input = screen.getByPlaceholderText('Search places...');

    // ACT
    fireEvent.change(input, { target: { value: 'Lond' } });
    fireEvent.change(input, { target: { value: 'London' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });

    // ASSERT
    expect(placeSearch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(placeSearch).toHaveBeenCalledTimes(1);
    expect(placeSearch).toHaveBeenCalledWith('London', expect.any(AbortSignal));
  });

  it('should show only real cloud-safe Copernicus dates and apply the selected date to imagery', async () => {
    // ARRANGE
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        type: 'FeatureCollection',
        features: [
          { properties: { id: 'scene-a', date: '2026-08-04', cloudCoverPercentage: 3.8 } },
          { properties: { id: 'scene-b', date: '2026-07-25', cloudCoverPercentage: 8.76 } },
          { properties: { id: 'scene-c', date: '2026-07-20', cloudCoverPercentage: 12 } },
        ],
      }), { status: 200 }),
    ));
    vi.useFakeTimers();
    render(<Map />);
    fireEvent.click(screen.getByRole('button', { name: 'Chlorophyll-a' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    vi.useRealTimers();

    // ACT
    fireEvent.click(screen.getByRole('button', { name: 'Dates' }));

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText('2 cloud-safe acquisitions')).toBeVisible();
    });
    const augustCalendar = screen.getByRole('grid', { name: 'August 2026' });
    const availableDay = within(augustCalendar).getByText('4', {
      selector: '.rdp-day_available',
    });
    expect(availableDay).toBeEnabled();
    expect(within(augustCalendar).getByText('5', {
      selector: '.rdp-day:not(.rdp-day_outside)',
    })).toBeDisabled();

    fireEvent.click(availableDay);

    expect(screen.getByTestId('wms-layer')).toHaveAttribute(
      'data-time',
      '2026-08-04T00:00:00Z/2026-08-04T23:59:59Z',
    );
    expect(screen.getByTestId('wms-layer')).toHaveAttribute('data-maxcc', '10');
  });

  it('should mount the CHLA WMS layer when Chlorophyll-a is selected', async () => {
    // ARRANGE
    vi.useFakeTimers();
    render(<Map />);

    // ACT
    fireEvent.click(screen.getByRole('button', { name: 'Chlorophyll-a' }));

    expect(screen.getByRole('status', { name: 'Analyzing satellite data' })).toBeVisible();
    expect(document.querySelector('.parameter-loader-overlay .loader')).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ASSERT
    expect(screen.getByRole('heading', { name: 'Chlorophyll-a' })).toBeVisible();
    expect(screen.getByTestId('wms-layer')).toHaveAttribute('data-layers', 'CHLA');
    const details = screen.getByRole('complementary', { name: 'Chlorophyll-a details' });
    expect(within(details).getByRole('button', { name: 'Close details' })).toBeVisible();
    expect(within(details).getByText('Calibrated measurement range unavailable')).toBeVisible();
    expect(within(details).getByText(/provider palette and scientific value mapping/i)).toBeVisible();
    expect(within(details).queryByLabelText('Chlorophyll-a color scale')).toBeNull();
  });

  it.each([
    ['Chlorophyll-a', 'CHLA', ['0.80635', '0.760724', '0.607419']],
    ['Dissolved Oxygen', 'DISSOLVED-OXYGEN', ['0.1953', '0.1975', '0.1992']],
    ['Total Suspended Solids', 'TOTAL-SUSPENDED-SOLIDS', ['0.528004', '0.056008', '0.471996']],
    ['Turbidity', 'TURBIDITY', ['0', '0', '0']],
  ])(
    'should keep the uncalibrated %s rendered channels unavailable',
    async (parameter, layer, renderedChannels) => {
    // ARRANGE
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {
              out1: String(renderedChannels[0]),
              out2: String(renderedChannels[1]),
              out3: String(renderedChannels[2]),
            },
          }],
        }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(<Map />);
    fireEvent.click(screen.getByRole('button', { name: parameter }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ACT
    await act(async () => {
      await mapHarness.clickHandler?.({ latlng: { lat: 51.5096, lng: -0.1099 } });
    });

    // ASSERT
    const pointDetails = screen.getByRole('region', { name: 'Selected point details' });
    expect(within(pointDetails).getByText(/Calibrated concentration unavailable/)).toBeVisible();
    expect(within(pointDetails).getByText('Unavailable')).toBeVisible();
    expect(within(pointDetails).queryByText('Out of the area of interest')).toBeNull();
    expect(screen.getByTestId('wms-layer')).toHaveAttribute('data-layers', layer);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(`QUERY_LAYERS=${layer}`);
  });

  it('should display a traceable provider scalar with its unit and method', async () => {
    // ARRANGE
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {
            id: 'S2C_SCENE.SAFE',
            date: '2026-07-31',
            cloudCoverPercentage: 6.04,
            value: '4.82',
            unit: 'mg/m³',
            method: 'configured-provider-scalar',
            methodVersion: 'chla-v1',
          },
        }],
      }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<Map />);
    fireEvent.click(screen.getByRole('button', { name: 'Chlorophyll-a' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ACT
    await act(async () => {
      await mapHarness.clickHandler?.({
        latlng: { lat: 51.5096, lng: -0.1099 },
      });
    });

    // ASSERT
    const pointDetails = screen.getByRole('region', { name: 'Selected point details' });
    expect(within(pointDetails).getByText('4.82 mg/m³')).toBeVisible();
    expect(within(pointDetails).getByText('Copernicus scalar output')).toBeVisible();
    expect(within(pointDetails).getByText('configured-provider-scalar (chla-v1)')).toBeVisible();
    expect(within(pointDetails).getByText('2026-07-31')).toBeVisible();
    expect(within(pointDetails).getByText('6.04%')).toBeVisible();
    expect(within(pointDetails).queryByText('Out of the area of interest')).toBeNull();
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(Object.fromEntries(requestUrl.searchParams)).toMatchObject({
      CRS: 'EPSG:4326',
      BBOX: '51.5095,-0.1100,51.5097,-0.1098',
      WIDTH: '1',
      HEIGHT: '1',
      I: '0',
      J: '0',
    });
  });

  it('should show out-of-area only when the provider supplies an explicit no-data mask', async () => {
    // ARRANGE
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { dataMask: 0, out1: '0', out2: '0', out3: '0' },
        }],
      }), { status: 200 }),
    ));
    render(<Map />);
    fireEvent.click(screen.getByRole('button', { name: 'Chlorophyll-a' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ACT
    await act(async () => {
      await mapHarness.clickHandler?.({ latlng: { lat: 51.5096, lng: -0.1099 } });
    });

    // ASSERT
    const pointDetails = screen.getByRole('region', { name: 'Selected point details' });
    expect(within(pointDetails).getByText('Value')).toBeVisible();
    expect(within(pointDetails).getByText('Out of the area of interest')).toBeVisible();
  });

  it('should issue the same analytical query for the same point at different zoom levels', async () => {
    // ARRANGE
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { out1: '0.8', out2: '0.7', out3: '0.6' },
        }],
      }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<Map />);
    fireEvent.click(screen.getByRole('button', { name: 'Chlorophyll-a' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ACT
    mapHarness.map.getZoom = vi.fn(() => 10);
    await act(async () => {
      await mapHarness.clickHandler?.({ latlng: { lat: 20.2, lng: -103.05 } });
    });
    mapHarness.map.getZoom = vi.fn(() => 15);
    await act(async () => {
      await mapHarness.clickHandler?.({ latlng: { lat: 20.2, lng: -103.05 } });
    });

    // ASSERT
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe(urls[1]);
  });
});
