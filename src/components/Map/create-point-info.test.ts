import { describe, expect, it } from 'vitest';

import {
  createAnalysisPointInfo,
  createNaturalColorPointInfo,
  createPointInfoError,
} from './create-point-info';

const point = { lat: 51.5096, lng: -0.1099 };

describe('point information factory', () => {
  it('should map a Copernicus result and classify its measurement', () => {
    const info = createAnalysisPointInfo(
      {
        value: 3.5,
        valueSource: 'color-estimate',
        acquisitionId: 'S2-scene',
        acquisitionDate: '2026-07-31',
        cloudCoverage: 6.04,
        outputValues: [3.5],
      },
      point,
      'CHLA',
    );

    expect(info).toEqual({
      value: 3.5,
      valueSource: 'color-estimate',
      quality: 'Medium',
      coordinates: [51.5096, -0.1099],
      acquisitionId: 'S2-scene',
      acquisitionDate: '2026-07-31',
      cloudCoverage: 6.04,
    });
  });

  it('should preserve an out-of-area result without inventing a value', () => {
    const info = createAnalysisPointInfo(
      {
        value: null,
        isOutOfArea: true,
        outputValues: [],
        message: 'Outside the rendered analysis footprint.',
      },
      point,
      'TURBIDITY',
    );

    expect(info).toMatchObject({
      value: null,
      isOutOfArea: true,
      quality: 'Unknown',
      message: 'Outside the rendered analysis footprint.',
    });
  });

  it('should create the natural-color guidance model', () => {
    expect(createNaturalColorPointInfo(point)).toEqual({
      value: null,
      quality: 'Unknown',
      coordinates: [51.5096, -0.1099],
      message: 'Please select a water quality parameter to view point values',
    });
  });

  it('should create a stable error model without exposing provider errors', () => {
    expect(createPointInfoError(point)).toEqual({
      value: null,
      quality: 'Unknown',
      coordinates: [51.5096, -0.1099],
      message: 'Unable to load a real Copernicus value for this point.',
    });
  });
});
