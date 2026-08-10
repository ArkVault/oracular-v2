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
    contextualOilSpillProps: null as null | {
      layerKey: string;
      selectedAcquisitionDate?: string;
    },
    wmsLoadHandler: null as null | (() => void),
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
    MapContainer: React.forwardRef(({
      center,
      children,
      zoom,
    }: {
      center: [number, number];
      children: ReactNode;
      zoom: number;
    }, ref) => {
      React.useImperativeHandle(ref, () => mapHarness.map);
      return (
        <div
          data-testid="map-container"
          data-center={JSON.stringify(center)}
          data-zoom={zoom}
        >
          {children}
        </div>
      );
    }),
    TileLayer: () => <div data-testid="base-layer" />,
    WMSTileLayer: ({
      eventHandlers,
      keepBuffer,
      layers,
      opacity,
      params,
    }: {
      eventHandlers?: { load?: () => void };
      keepBuffer?: number;
      layers: string;
      opacity?: number;
      params?: Record<string, string | number>;
    }) => {
      mapHarness.wmsLoadHandler = eventHandlers?.load ?? null;
      return (
        <div
          data-testid="wms-layer"
          data-layers={layers}
          data-time={params?.TIME}
          data-maxcc={params?.MAXCC}
          data-evalscript={params?.EVALSCRIPT}
          data-opacity={opacity}
          data-keep-buffer={keepBuffer}
        />
      );
    },
  };
});

vi.mock('../../src/components/Map/DrawControl', () => ({
  DrawControl: () => <div data-testid="draw-control" />,
}));

vi.mock('../../src/components/Map/ContextualOilSpillLayer', () => ({
  ContextualOilSpillLayer: ({
    layerKey,
    selectedAcquisitionDate,
  }: {
    layerKey: string;
    selectedAcquisitionDate?: string;
  }) => {
    mapHarness.contextualOilSpillProps = { layerKey, selectedAcquisitionDate };
    return <div data-testid="contextual-oil-spill-layer" />;
  },
}));

import { Map } from '../../src/components/Map/Map';
import App from '../../src/App';
import { createAppServices, type AppServices } from '../../src/app/services';
import type { AcquisitionDate } from '../../src/features/acquisitions/ports/acquisition-date-provider';

const ACQUISITION_FIXTURE = {
  acquisitionId: 'scene-a',
  acquiredAt: '2026-08-04T17:38:17.066Z',
  cloudCoverage: 3.8,
  date: '2026-08-04',
};

function createTestServices(acquisitions: AcquisitionDate[] = []): AppServices {
  return {
    ...createAppServices(),
    acquisitionDates: {
      list: vi.fn().mockResolvedValue(acquisitions),
    },
  };
}

describe('Map workspace integration', () => {
  beforeEach(() => {
    const storedPreferences = new globalThis.Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storedPreferences.get(key) ?? null),
      removeItem: vi.fn((key: string) => storedPreferences.delete(key)),
      setItem: vi.fn((key: string, value: string) => storedPreferences.set(key, value)),
    });
    mapHarness.clickHandler = null;
    mapHarness.contextualOilSpillProps = null;
    mapHarness.wmsLoadHandler = null;
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
    render(<Map services={createTestServices()} />);

    // ASSERT
    expect(screen.getByRole('button', { name: 'Dates' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Dates' })).toHaveAttribute('data-slot', 'button');
    expect(screen.getByRole('button', { name: 'Sensors' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Search' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Account' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Turn off workflow guide' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Turn off workflow guide' })).toHaveTextContent('Guide');
    expect(screen.getByRole('button', { name: 'Chlorophyll-a' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Water Quality' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Water Quality' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('button', { name: /Index 0.*Available/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Total Suspended Solids' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Turbidity' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dissolved Oxygen' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Forest Fire Detection' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Oil Spill Detection' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sargassum Detection' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hide indicators' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Draw polygon' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Draw rectangle' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Clear drawings' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Select Area' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dashboard' })).toBeNull();
  });

  it('should use a distinct semantic icon for every primary indicator', () => {
    // ARRANGE + ACT
    render(<Map services={createTestServices()} />);
    const naturalColorIcon = screen.getByRole('button', { name: 'Natural Color' })
      .querySelector('svg');
    const chlorophyllIcon = screen.getByRole('button', { name: 'Chlorophyll-a' })
      .querySelector('svg');
    const waterQualityIcon = screen.getByRole('button', { name: 'Water Quality' })
      .querySelector('svg');
    const forestFireIcon = screen.getByRole('button', { name: 'Forest Fire Detection' })
      .querySelector('svg');
    const oilSpillIcon = screen.getByRole('button', { name: 'Oil Spill Detection' })
      .querySelector('svg');
    const sargassumIcon = screen.getByRole('button', { name: 'Sargassum Detection' })
      .querySelector('svg');

    // ASSERT
    expect(naturalColorIcon).toHaveClass('lucide-satellite');
    expect(chlorophyllIcon).toHaveClass('lucide-sprout');
    expect(waterQualityIcon).toHaveClass('lucide-flask-conical');
    expect(forestFireIcon).toHaveClass('lucide-flame');
    expect(oilSpillIcon).toHaveClass('lucide-droplet');
    expect(sargassumIcon).toHaveClass('lucide-leaf');
  });

  it('should keep a glass edge on the indicator panel for dark imagery', () => {
    // ARRANGE + ACT
    render(<Map services={createTestServices()} />);
    const indicatorPanel = screen.getByRole('heading', { name: 'Indicators' })
      .closest('.oracular-indicator-panel');

    // ASSERT
    expect(indicatorPanel).toHaveClass('has-glass-edge');
  });

  it('should apply Figtree to titles and DM Sans to panels and references', () => {
    // ARRANGE + ACT
    render(<Map services={createTestServices()} />);
    const mapShell = screen.getByRole('navigation', { name: 'Primary navigation' })
      .closest('.map-shell') as HTMLElement;

    // ASSERT
    expect(mapShell.style.getPropertyValue('--oracular-font-title')).toContain('Figtree');
    expect(mapShell.style.getPropertyValue('--oracular-font-body')).toContain('DM Sans');
    expect(screen.getByRole('complementary', { name: 'Natural Color details' }))
      .toHaveClass('oracular-detail-panel');
  });

  it('should not show an analysis-limit badge in Natural Color', () => {
    // ARRANGE + ACT
    render(<Map services={createTestServices()} />);
    const details = screen.getByRole('complementary', { name: 'Natural Color details' });

    // ASSERT
    expect(within(details).queryByText(/analysis per indicator/i)).toBeNull();
    expect(within(details).queryByRole('note', {
      name: 'Request efficiency and API safeguards',
    })).toBeNull();
    expect(within(details).queryByText(/create one active analysis request/i)).toBeNull();
  });

  it('should guide place search, date, and indicator selection and allow the guide to be toggled', async () => {
    // ARRANGE
    await import('react-day-picker');
    const services = {
      ...createTestServices([ACQUISITION_FIXTURE]),
      placeSearch: {
        search: vi.fn().mockResolvedValue([{
          id: 'holbox',
          latitude: 21.52324,
          longitude: -87.37781,
          name: 'Holbox, Quintana Roo, Mexico',
        }]),
      },
    };
    render(<Map services={services} />);

    // ACT + ASSERT — place search
    const guide = screen.getByRole('dialog', { name: 'Workflow guide' });
    const spotlight = screen.getByTestId('workflow-spotlight');
    expect(spotlight).toHaveAttribute('data-step', 'search');
    const mapShell = guide.closest('.map-shell');
    expect(mapShell).toHaveClass('has-workflow-guide', 'workflow-step-search');
    expect(within(guide).getByText('Search for a place')).toBeVisible();
    expect(within(guide).getByText('Step 1 of 4')).toBeVisible();
    fireEvent.click(within(guide).getByRole('button', { name: 'Open Search' }));
    const searchInput = screen.getByPlaceholderText('Search places...');
    vi.useFakeTimers();
    fireEvent.change(searchInput, { target: { value: 'Holbox' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    vi.useRealTimers();
    fireEvent.click(await screen.findByRole('button', { name: 'Holbox, Quintana Roo, Mexico' }));

    // ACT + ASSERT — date
    expect(within(guide).getByText('Choose an acquisition date')).toBeVisible();
    expect(spotlight).toHaveAttribute('data-step', 'dates');
    expect(mapShell).toHaveClass('workflow-step-dates');
    expect(within(guide).getByText('Step 2 of 4')).toBeVisible();
    fireEvent.click(within(guide).getByRole('button', { name: 'Open Dates' }));
    expect(screen.getByTestId('calendar-backdrop')).toBeVisible();
    const calendar = await screen.findByRole('grid', { name: 'August 2026' });
    fireEvent.click(within(calendar).getByRole('button', {
      name: /^Tuesday, August 4th, 2026/,
    }));

    // ACT + ASSERT — indicator
    expect(within(guide).getByText('Choose an indicator')).toBeVisible();
    expect(within(guide).getByText(/indicator access is unrestricted/i)).toBeVisible();
    expect(spotlight).toHaveAttribute('data-step', 'indicators');
    expect(mapShell).toHaveClass('workflow-step-indicators');
    expect(within(guide).getByText('Step 3 of 4')).toBeVisible();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Chlorophyll-a' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    vi.useRealTimers();

    // ACT + ASSERT — ready
    await waitFor(() => {
      expect(within(guide).getByRole('heading', { name: 'Ready to go' })).toBeVisible();
    });
    expect(spotlight).toHaveAttribute('data-step', 'ready');
    expect(mapShell).toHaveClass('workflow-step-ready');
    expect(within(guide).getByText('Step 4 of 4')).toBeVisible();
    fireEvent.click(within(guide).getByRole('button', { name: 'Ready to go' }));
    expect(screen.queryByRole('dialog', { name: 'Workflow guide' })).toBeNull();

    // ACT + ASSERT — top-bar toggle
    const toggle = screen.getByRole('button', { name: 'Turn on workflow guide' });
    fireEvent.click(toggle);
    expect(screen.getByRole('dialog', { name: 'Workflow guide' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Turn off workflow guide' }));
    expect(screen.queryByRole('dialog', { name: 'Workflow guide' })).toBeNull();
    expect(window.localStorage.getItem('oracular.workflow-guide')).toBe('off');
  });

  it('should mount an indicator without consuming an analysis allowance', async () => {
    // ARRANGE
    vi.useFakeTimers();
    render(<Map services={createTestServices()} />);

    // ACT
    fireEvent.click(screen.getByRole('button', { name: 'Chlorophyll-a' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ASSERT
    expect(screen.getByTestId('wms-layer')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('should keep the workflow guide off after the user dismisses it', () => {
    // ARRANGE
    const view = render(<Map services={createTestServices()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Turn off workflow guide' }));
    view.unmount();

    // ACT
    render(<Map services={createTestServices()} />);

    // ASSERT
    expect(screen.queryByRole('dialog', { name: 'Workflow guide' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Turn on workflow guide' })).toHaveTextContent('Guide');
  });

  it('should start and reset the default map view on Ciudad del Carmen, Mexico', () => {
    // ARRANGE
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      type: 'FeatureCollection',
      features: [],
    }), { status: 200 })));

    // ACT
    render(<App />);

    // ASSERT
    expect(screen.getByTestId('map-container')).toHaveAttribute(
      'data-center',
      '[18.64592,-91.82991]',
    );
    expect(screen.getByTestId('map-container')).toHaveAttribute('data-zoom', '10');

    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(mapHarness.map.setView as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      [18.64592, -91.82991],
      10,
    );
  });

  it('should screen Sentinel-1 positive-contrast Sargassum candidates in coastal water', async () => {
    // ARRANGE
    vi.useFakeTimers();
    render(<Map services={createTestServices()} />);

    // ACT
    fireEvent.click(screen.getByRole('button', { name: 'Sargassum Detection' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ASSERT
    const layer = screen.getByTestId('wms-layer');
    expect(layer).toHaveAttribute('data-layers', 'INFRAR');
    expect(layer).not.toHaveAttribute('data-maxcc');
    const source = atob(layer.getAttribute('data-evalscript') ?? '');
    expect(source).toContain('0.1 * sample.VV + 3 * sample.VH');
    expect(source).toContain('vvDb <= conservativeWaterAnchorVvDb');
    expect(source).toContain('vhDb > waterMaxVhDb && vhDb <= positiveContrastMaxVhDb');

    const details = screen.getByRole('complementary', { name: 'Sargassum Detection details' });
    expect(within(details).getByText('Potential positive-contrast Sargassum raft')).toBeVisible();
    expect(within(details).getByText('Marine SAR background')).toBeVisible();
    expect(within(details).getByRole('note', {
      name: 'Oracular improved index implementation',
    })).toHaveTextContent(/Sentinel-1.*river-versus-sea.*CFAR/i);
    expect(within(details).getByRole('link', {
      name: 'Biermann et al. (2024) — Sentinel-1 SARgassum index',
    })).toHaveAttribute('href', 'https://doi.org/10.1109/IGARSS53475.2024.10641475');
    expect(within(details).getByRole('link', {
      name: 'Qi et al. (2022) — Sentinel-1 floating macroalgae capability',
    })).toHaveAttribute('href', 'https://doi.org/10.1016/j.rse.2022.113188');
  });

  it('should request Sentinel-1 acquisition timestamps for Sargassum Detection', async () => {
    // ARRANGE
    vi.useFakeTimers();
    const list = vi.fn().mockResolvedValue([]);
    render(<Map services={{
      ...createTestServices(),
      acquisitionDates: { list },
    }} />);

    // ACT
    fireEvent.click(screen.getByRole('button', { name: 'Sargassum Detection' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ASSERT
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'sentinel-1' }),
    );
  });

  it('should render Sentinel-1 oil-like candidates with contextual marine screening', async () => {
    // ARRANGE
    vi.useFakeTimers();
    render(<Map services={createTestServices()} />);

    // ACT
    fireEvent.click(screen.getByRole('button', { name: 'Oil Spill Detection' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ASSERT
    expect(screen.getByTestId('contextual-oil-spill-layer')).toBeVisible();
    expect(screen.queryByTestId('wms-layer')).not.toBeInTheDocument();
    expect(mapHarness.contextualOilSpillProps?.layerKey).toContain('OIL-SPILL-SAR');

    const details = screen.getByRole('complementary', { name: 'Oil Spill Detection details' });
    expect(within(details).getByText('Potential oil-like dark return')).toBeVisible();
    expect(within(details).getByText('SAR water background')).toBeVisible();
    expect(within(details).getByRole('note', {
      name: 'Oracular improved index implementation',
    })).toHaveTextContent(/local CFAR.*low-wind water.*locally anomalous/i);
    expect(within(details).getByRole('link', {
      name: 'Yang et al. (2022) — Sentinel-1 SAR oil-spill detector',
    })).toHaveAttribute('href', 'https://doi.org/10.1080/01431161.2022.2109445');
    expect(within(details).getByRole('link', {
      name: 'Copernicus Sentinel-1 oil-spill success story',
    })).toHaveAttribute('href', expect.stringContaining('sentinels.copernicus.eu'));
    expect(within(details).getByRole('link', {
      name: 'ICEYE — Timely SAR oil-spill response cases',
    })).toHaveAttribute('href', expect.stringContaining('iceye.com'));
    expect(within(details).getByRole('link', {
      name: 'Habibie et al. (2025) — VV dark-return threshold',
    })).toHaveAttribute('href', 'https://doi.org/10.1007/s10661-025-14222-z');
  });

  it('should request Sentinel-1 acquisition timestamps for Oil Spill Detection', async () => {
    // ARRANGE
    vi.useFakeTimers();
    const list = vi.fn().mockResolvedValue([]);
    render(<Map services={{
      ...createTestServices(),
      acquisitionDates: { list },
    }} />);

    // ACT
    fireEvent.click(screen.getByRole('button', { name: 'Oil Spill Detection' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ASSERT
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'sentinel-1' }),
    );
  });

  it('should expand Water Quality without NDCI while preserving Chlorophyll-a', () => {
    // ARRANGE
    render(<Map services={createTestServices()} />);

    // ACT
    const waterQualityButton = screen.getByRole('button', { name: 'Water Quality' });
    fireEvent.click(waterQualityButton);

    // ASSERT
    expect(waterQualityButton).toHaveAttribute('aria-expanded', 'true');
    const indices = screen.getByRole('group', { name: 'MAGO water quality indices' });
    expect(within(indices).getAllByRole('button')).toHaveLength(3);
    expect(within(indices).queryByRole('button', { name: /NDCI/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Chlorophyll-a' })).toBeVisible();
    expect(within(indices).getByRole('button', {
      name: /Index 6.*CDOM.*µg\/L QSE.*Available/,
    })).toBeEnabled();
    expect(within(indices).getByRole('button', {
      name: /Index 5.*Turbidity.*NTU.*Available/,
    })).toBeEnabled();
    expect(within(indices).getByRole('button', {
      name: /Index 7.*Total Suspended Solids.*mg\/L.*Available/,
    })).toBeEnabled();
    expect(within(indices).queryByRole('button', { name: /high values/ })).toBeNull();
    expect(within(indices).queryByRole('button', { name: /low values/ })).toBeNull();
    expect(within(indices).queryByRole('button', { name: /Cyanobacteria/ })).toBeNull();
    expect(screen.queryByTestId('wms-layer')).toBeNull();
    expect(screen.getByRole('complementary', { name: 'Natural Color details' })).toBeVisible();

    fireEvent.click(waterQualityButton);
    expect(waterQualityButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'MAGO water quality indices' })).toBeNull();
  });

  it.each([
    {
      button: /Index 6.*CDOM.*µg\/L QSE.*Available/,
      formula: '2.4072 * (sample.B04 / sample.B02) + 0.0709',
      detailsName: 'CDOM details',
      method: 'MAGO index 6 — CDOM',
      minimum: '0.03 µg/L QSE',
      maximum: '5.3 µg/L QSE',
      intermediate: '3.98 µg/L QSE',
      citation: 'Sòria-Perpinyà et al. (2021) — Sentinel-2 CDOM model',
      href: 'https://doi.org/10.3390/w13050686',
    },
    {
      button: /Index 5.*Turbidity.*NTU.*Available/,
      formula: '194.79 * (sample.B05 * (sample.B05 / sample.B02)) + 0.9061',
      detailsName: 'Turbidity details',
      method: 'MAGO index 5 — Turbidity',
      minimum: '0.1 NTU',
      maximum: '15.89 NTU',
      intermediate: '11.94 NTU',
      citation: 'Zhan et al. (2022) — Sentinel-2 turbidity model',
      href: 'https://doi.org/10.23818/limn.41.18',
    },
    {
      button: /Index 7.*Total Suspended Solids.*mg\/L.*Available/,
      formula: '14.464 * ratio + 16.336',
      detailsName: 'Total Suspended Solids details',
      method: 'MAGO index 7 — Total Suspended Solids',
      minimum: '20 mg/L',
      maximum: '78.82 mg/L',
      intermediate: '64.12 mg/L',
      citation: 'Sòria-Perpinyà et al. (2021) — Sentinel-2 TSS model',
      href: 'https://doi.org/10.3390/w13050686',
    },
  ])('should apply $detailsName with its formula, prior palette, and source', async ({
    button,
    formula,
    detailsName,
    method,
    minimum,
    maximum,
    intermediate,
    citation,
    href,
  }) => {
    // ARRANGE
    vi.useFakeTimers();
    render(<Map services={createTestServices()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Water Quality' }));

    // ACT
    fireEvent.click(screen.getByRole('button', { name: button }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ASSERT
    const layer = screen.getByTestId('wms-layer');
    expect(layer).toHaveAttribute('data-layers', 'CHLA');
    expect(atob(layer.getAttribute('data-evalscript') ?? '')).toContain(formula);
    const details = screen.getByRole('complementary', { name: detailsName });
    expect(within(details).getByText(method)).toBeVisible();
    expect(within(details).getByText(minimum)).toBeVisible();
    expect(within(details).getByText(maximum)).toBeVisible();
    expect(within(details).getByText(intermediate)).toBeVisible();
    expect(within(details).getByRole('link', { name: citation })).toHaveAttribute('href', href);
    expect(within(details).getByRole('note', {
      name: 'Oracular improved index implementation',
    })).toHaveTextContent('Level-1C');
  });

  it('should defer drawing tools until the first drawing command', async () => {
    render(<Map services={createTestServices()} />);

    expect(screen.queryByTestId('draw-control')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Draw polygon' }));

    expect(await screen.findByTestId('draw-control')).toBeVisible();
  });

  it('should expose the modular Oracular V2 navigation and keep overlays mutually exclusive', () => {
    // ARRANGE
    render(<Map services={createTestServices()} />);

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
          { properties: { id: 'scene-a', date: '2026-08-04', time: '17:38:17.066', cloudCoverPercentage: 3.8 } },
          { properties: { id: 'scene-b', date: '2026-07-25', time: '17:38:18.023', cloudCoverPercentage: 8.76 } },
          { properties: { id: 'scene-c', date: '2026-07-20', time: '17:38:20.183', cloudCoverPercentage: 12 } },
        ],
      }), { status: 200 }),
    ));
    vi.useFakeTimers();
    render(<Map services={createAppServices()} />);
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
    expect(screen.getByText('Colored dates have available imagery')).toBeVisible();
    const augustCalendar = await screen.findByRole('grid', { name: 'August 2026' });
    const availableDay = within(augustCalendar).getByRole('button', {
      name: /^Tuesday, August 4th, 2026/,
    });
    expect(availableDay).toBeEnabled();
    expect(availableDay.closest('td')).toHaveClass('rdp-day_available');
    expect(within(augustCalendar).getByRole('button', {
      name: 'Wednesday, August 5th, 2026',
    })).toBeDisabled();
    expect(within(augustCalendar).queryByRole('button', {
      name: 'Friday, July 31st, 2026',
    })).toBeNull();
    expect(within(augustCalendar).queryByRole('button', {
      name: 'Tuesday, September 1st, 2026',
    })).toBeNull();

    expect(screen.getByTestId('wms-layer')).toHaveAttribute(
      'data-time',
      '2026-08-04T00:00:00Z/2026-08-04T23:59:59Z',
    );
    expect(screen.getByTestId('wms-layer')).toHaveAttribute('data-maxcc', '10');
    const acquisitionBadge = screen.getByLabelText('Image acquisition');
    expect(acquisitionBadge).toHaveTextContent('04 Aug 2026');
    expect(acquisitionBadge).toHaveTextContent('17:38:17 UTC');
    expect(within(acquisitionBadge).getByRole('time')).toHaveAttribute(
      'datetime',
      '2026-08-04T17:38:17.066Z',
    );
  });

  it.each([
    'Natural Color',
    'Chlorophyll-a',
    'Forest Fire Detection',
  ])('should show the image acquisition badge in the %s view', async (parameter) => {
    // ARRANGE
    vi.useFakeTimers();
    render(<Map services={createTestServices([ACQUISITION_FIXTURE])} />);

    // ACT
    fireEvent.click(screen.getByRole('button', { name: parameter }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ASSERT
    const acquisitionBadge = screen.getByLabelText('Image acquisition');
    expect(acquisitionBadge).toHaveTextContent('04 Aug 2026');
    expect(acquisitionBadge).toHaveTextContent('17:38:17 UTC');
    expect(within(acquisitionBadge).getByRole('time')).toHaveAttribute(
      'datetime',
      ACQUISITION_FIXTURE.acquiredAt,
    );
  });

  it('should show the acquisition badge after applying a water-quality index', async () => {
    // ARRANGE
    vi.useFakeTimers();
    render(<Map services={createTestServices([ACQUISITION_FIXTURE])} />);

    // ACT
    fireEvent.click(screen.getByRole('button', { name: 'Water Quality' }));
    fireEvent.click(screen.getByRole('button', {
      name: /Index 6.*CDOM.*Available/,
    }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ASSERT
    const acquisitionBadge = screen.getByLabelText('Image acquisition');
    expect(acquisitionBadge).toHaveTextContent('04 Aug 2026');
    expect(acquisitionBadge).toHaveTextContent('17:38:17 UTC');
  });

  it('should mount the Ulyssys MCI evalscript when Chlorophyll-a is selected', async () => {
    // ARRANGE
    vi.useFakeTimers();
    render(<Map services={createTestServices()} />);

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
    const encodedEvalscript = screen.getByTestId('wms-layer').getAttribute('data-evalscript');
    expect(encodedEvalscript).toBeTruthy();
    const evalscript = atob(encodedEvalscript ?? '');
    expect(evalscript).toContain('Ulyssys Water Quality Viewer');
    expect(evalscript).toContain('sample.B05 - MCI_RED_WEIGHT * sample.B04');
    expect(evalscript).not.toContain('tssIndex');
    const details = screen.getByRole('complementary', { name: 'Chlorophyll-a details' });
    expect(within(details).getByRole('button', { name: 'Close details' })).toBeVisible();
    expect(within(details).queryByText('Calibrated measurement range unavailable')).toBeNull();
    expect(within(details).getByLabelText('Chlorophyll-a color scale')).toBeVisible();
    expect(within(details).getByText('-0.005 MCI')).toBeVisible();
    expect(within(details).getByText('0.05 MCI')).toBeVisible();
    const implementationNote = within(details).getByRole('note', {
      name: 'Oracular improved index implementation',
    });
    expect(implementationNote).toHaveTextContent('TSS blending is disabled');
    expect(implementationNote).toHaveTextContent('not a concentration');
    expect(within(details).getByText(/MCI spectral-contrast index/i)).toBeVisible();
    expect(within(details).getByRole('link', {
      name: 'Zlinszky & Padányi-Gulyás (2020) — Ulyssys Water Quality Viewer',
    })).toHaveAttribute(
      'href',
      'https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ulyssys_water_quality_viewer/',
    );
    expect(within(details).getByRole('link', {
      name: 'Ulyssys technical description supplementary',
    })).toHaveAttribute('href', 'https://doi.org/10.20944/preprints202001.0386.v1');
  });

  it('should reveal an indicator mosaic only after all visible WMS tiles load', async () => {
    // ARRANGE
    vi.useFakeTimers();
    render(<Map services={createTestServices()} />);

    // ACT
    fireEvent.click(screen.getByRole('button', { name: 'Chlorophyll-a' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    // ASSERT — incomplete mosaics stay hidden over the basemap
    expect(screen.getByTestId('wms-layer')).toHaveAttribute('data-opacity', '0');
    expect(screen.getByTestId('wms-layer')).toHaveAttribute('data-keep-buffer', '0');
    expect(screen.getByRole('status', { name: 'Analyzing satellite data' })).toBeVisible();

    // ACT — Leaflet confirms every visible tile is ready
    act(() => mapHarness.wmsLoadHandler?.());

    // ASSERT — the complete mosaic is revealed atomically
    expect(screen.getByTestId('wms-layer')).toHaveAttribute('data-opacity', '1');
    expect(screen.queryByRole('status', { name: 'Analyzing satellite data' })).toBeNull();
  });

  it('should discard pending indicator loads and mount only the latest request', async () => {
    // ARRANGE — start with a fully mounted indicator layer
    vi.useFakeTimers();
    render(<Map services={createTestServices()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chlorophyll-a' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(screen.getByTestId('wms-layer')).toHaveAttribute('data-layers', 'CHLA');

    // ACT — replace an in-flight oil-spill request with sargassum
    fireEvent.click(screen.getByRole('button', { name: 'Oil Spill Detection' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sargassum Detection' }));

    // ASSERT — the previous layer and superseded request remain absent
    expect(screen.queryByTestId('wms-layer')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.queryByTestId('wms-layer')).toBeNull();

    // ACT — allow only the latest request to become active
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    // ASSERT
    expect(screen.getByTestId('wms-layer')).toHaveAttribute('data-layers', 'INFRAR');
  });

  it.each([
    ['Chlorophyll-a', 'CHLA', 'CHLA', ['0.80635', '0.760724', '0.607419']],
  ])(
    'should keep the %s rendered channels unavailable as a point scalar',
    async (parameter, layer, renderedLayer, renderedChannels) => {
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
    render(<Map services={createTestServices()} />);
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
    expect(within(pointDetails).getByText(/documented qualitative index palette/)).toBeVisible();
    expect(within(pointDetails).getByText(/must not be interpreted as chlorophyll-a concentration/)).toBeVisible();
    expect(within(pointDetails).getByText('Unavailable')).toBeVisible();
    expect(within(pointDetails).queryByText('Out of the area of interest')).toBeNull();
    expect(screen.getByTestId('wms-layer')).toHaveAttribute('data-layers', renderedLayer);
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
    render(<Map services={createTestServices()} />);
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
    render(<Map services={createTestServices()} />);
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
    render(<Map services={createTestServices()} />);
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
