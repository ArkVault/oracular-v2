import { describe, expect, it } from 'vitest';

import {
  createAnalysisPointInfo,
  createNaturalColorPointInfo,
  createPointInfoError,
} from './create-point-info';

const point = { lat: 51.5096, lng: -0.1099 };

describe('point information factory', () => {
  it('should preserve scalar provenance without inventing a quality classification', () => {
    // ARRANGE + ACT
    const info = createAnalysisPointInfo({
      parameter: 'CHLA',
      value: 3.5,
      unit: 'mg/m³',
      valueSource: 'provider-scalar',
      isEstimate: false,
      method: 'configured-provider-scalar',
      methodVersion: 'chla-v1',
      acquisitionId: 'S2-scene',
      acquisitionDate: '2026-07-31',
      cloudCoverage: 6.04,
      outputValues: [],
    }, point);

    // ASSERT
    expect(info).toMatchObject({
      parameter: 'CHLA',
      value: 3.5,
      unit: 'mg/m³',
      valueSource: 'provider-scalar',
      isEstimate: false,
      quality: 'Unknown',
      method: 'configured-provider-scalar',
      methodVersion: 'chla-v1',
      acquisitionId: 'S2-scene',
    });
  });

  it('should preserve an explicit out-of-area result', () => {
    // ARRANGE + ACT
    const info = createAnalysisPointInfo({
      parameter: 'TURBIDITY',
      value: null,
      valueSource: 'unavailable',
      isEstimate: false,
      isOutOfArea: true,
      outputValues: [],
      message: 'Out of the analytical area (provider dataMask=0).',
    }, point);

    // ASSERT
    expect(info).toMatchObject({
      value: null,
      valueSource: 'unavailable',
      isOutOfArea: true,
      quality: 'Unknown',
    });
  });

  it('should create stable natural-color and error models', () => {
    // ARRANGE + ACT + ASSERT
    expect(createNaturalColorPointInfo(point)).toMatchObject({
      parameter: 'Natural Color',
      value: null,
      valueSource: 'unavailable',
      isEstimate: false,
    });
    expect(createPointInfoError(point)).toMatchObject({
      parameter: 'Unknown',
      value: null,
      valueSource: 'unavailable',
      isEstimate: false,
    });
  });
});
