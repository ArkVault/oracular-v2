import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PointInfoSection } from './PointInfoSection';

describe('PointInfoSection', () => {
  it('should present a traceable provider scalar and metadata', () => {
    // ARRANGE
    const onClose = vi.fn();
    render(
      <PointInfoSection
        info={{
          parameter: 'CHLA',
          value: 4.82,
          unit: 'mg/m³',
          valueSource: 'provider-scalar',
          isEstimate: false,
          method: 'configured-provider-scalar',
          methodVersion: 'chla-v1',
          quality: 'Unknown',
          coordinates: [51.5096, -0.1099],
          acquisitionDate: '2026-07-31',
          cloudCoverage: 6.04,
          acquisitionId: 'S2C_SCENE.SAFE',
        }}
        onClose={onClose}
      />,
    );

    // ACT
    fireEvent.click(screen.getByRole('button', { name: 'Close point details' }));

    // ASSERT
    expect(screen.getByText('4.82 mg/m³')).toBeVisible();
    expect(screen.getByText('Copernicus scalar output')).toBeVisible();
    expect(screen.getByText('configured-provider-scalar (chla-v1)')).toBeVisible();
    expect(screen.queryByText('Quality')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should explain an unavailable rendered color without calling it out-of-area', () => {
    // ARRANGE + ACT
    render(
      <PointInfoSection
        info={{
          parameter: 'CHLA',
          value: null,
          valueSource: 'unavailable',
          isEstimate: false,
          quality: 'Unknown',
          coordinates: [20.2, -103.05],
          message: 'Calibrated concentration unavailable. The selected layer returns rendered color channels, but its scientific value-to-color mapping is not available.',
        }}
        onClose={vi.fn()}
      />,
    );

    // ASSERT
    expect(screen.getByText(/Calibrated concentration unavailable/)).toBeVisible();
    expect(screen.getByText('Unavailable')).toBeVisible();
    expect(screen.queryByText('Out of the area of interest')).toBeNull();
  });

  it('should show out-of-area only for explicit provider no-data', () => {
    // ARRANGE + ACT
    render(
      <PointInfoSection
        info={{
          parameter: 'CHLA',
          value: null,
          valueSource: 'unavailable',
          isEstimate: false,
          isOutOfArea: true,
          quality: 'Unknown',
          coordinates: [0, 0],
        }}
        onClose={vi.fn()}
      />,
    );

    // ASSERT
    expect(screen.getByText('Out of the area of interest')).toBeVisible();
  });
});
