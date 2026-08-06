import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PointInfoSection } from './PointInfoSection';

describe('PointInfoSection', () => {
  it('should present traceable point metadata and allow dismissing the selection', () => {
    // ARRANGE
    const onClose = vi.fn();
    render(
      <PointInfoSection
        info={{
          value: null,
          quality: 'Unknown',
          coordinates: [51.5096, -0.1099],
          message: 'Copernicus returned rendered channels, not a scalar analysis value.',
          acquisitionDate: '2026-07-31',
          cloudCoverage: 6.04,
          acquisitionId: 'S2C_SCENE.SAFE',
        }}
        unit="mg/m³"
        onClose={onClose}
      />,
    );

    // ACT
    const section = screen.getByRole('region', { name: 'Selected point details' });
    fireEvent.click(screen.getByRole('button', { name: 'Close point details' }));

    // ASSERT
    expect(section.textContent).toContain('51.5096, -0.1099');
    expect(section.textContent).toContain('2026-07-31');
    expect(section.textContent).toContain('6.04%');
    expect(section.textContent).toContain('S2C_SCENE.SAFE');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should distinguish a color-derived estimate from a direct measurement', () => {
    // ARRANGE + ACT
    render(
      <PointInfoSection
        info={{
          value: 2.5,
          valueSource: 'color-estimate',
          quality: 'Good',
          coordinates: [51.5096, -0.1099],
          message: 'Estimated from the rendered pixel color; this is not a direct sensor measurement.',
        }}
        unit="mg/m³"
        onClose={vi.fn()}
      />,
    );

    // ASSERT
    expect(screen.getByText('Estimated value')).toBeTruthy();
    expect(screen.getByText('2.50 mg/m³')).toBeTruthy();
    expect(screen.getByText('Good')).toBeTruthy();
    expect(screen.getByText(/not a direct sensor measurement/i)).toBeTruthy();
  });

  it('should label a pixel outside the scale as outside the area of interest', () => {
    // ARRANGE + ACT
    render(
      <PointInfoSection
        info={{
          value: null,
          isOutOfArea: true,
          quality: 'Unknown',
          coordinates: [51.5096, -0.1099],
        }}
        unit="mg/m³"
        onClose={vi.fn()}
      />,
    );

    // ASSERT
    expect(screen.getByText('Estimated value')).toBeTruthy();
    expect(screen.getByText('Out of the area of interest')).toBeTruthy();
    expect(screen.queryByText('Quality')).toBeNull();
  });
});
