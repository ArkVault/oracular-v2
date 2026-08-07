import { describe, expect, it } from 'vitest';

import {
  getMeasurementDefinition,
} from './measurement-scale';

describe('measurement definitions', () => {
  it.each([
    ['CHLA', 'Chlorophyll-a', 'mg/m³'],
    ['DISSOLVED-OXYGEN', 'Dissolved Oxygen', 'mg/L'],
    ['TOTAL-SUSPENDED-SOLIDS', 'Total Suspended Solids', 'mg/L'],
    ['TURBIDITY', 'Turbidity', 'NTU'],
  ])('should define the parameter and unit for %s', (layer, parameter, unit) => {
    // ARRANGE + ACT
    const definition = getMeasurementDefinition(layer);

    // ASSERT
    expect(definition).toEqual({
      parameter,
      unit,
      minimum: 0,
      calibrationStatus: 'unavailable',
    });
  });

  it('should not invent a definition for an unsupported layer', () => {
    // ARRANGE + ACT + ASSERT
    expect(getMeasurementDefinition('UNKNOWN')).toBeUndefined();
  });
});
