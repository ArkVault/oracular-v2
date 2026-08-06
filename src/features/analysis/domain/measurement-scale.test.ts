import { describe, expect, it } from 'vitest';

import { getMeasurementScale } from './measurement-scale';

describe('measurement scales', () => {
  it('should expose the intended boundaries and units for every continuous indicator', () => {
    // ARRANGE + ACT
    const chlorophyll = getMeasurementScale('CHLA');
    const oxygen = getMeasurementScale('DISSOLVED-OXYGEN');
    const solids = getMeasurementScale('TOTAL-SUSPENDED-SOLIDS');
    const turbidity = getMeasurementScale('TURBIDITY');

    // ASSERT
    expect(chlorophyll).toMatchObject({ unit: 'mg/m³', values: [0, 2.5, 7, 10] });
    expect(oxygen).toMatchObject({ unit: 'mg/L', values: [0, 5, 8, 14] });
    expect(solids).toMatchObject({ unit: 'mg/L', values: [0, 30, 70, 100] });
    expect(turbidity).toMatchObject({ unit: 'NTU', values: [0, 15, 35, 50] });
  });

  it('should preserve the intended color progression for every continuous indicator', () => {
    // ARRANGE + ACT
    const chlorophyll = getMeasurementScale('CHLA');
    const oxygen = getMeasurementScale('DISSOLVED-OXYGEN');
    const solids = getMeasurementScale('TOTAL-SUSPENDED-SOLIDS');
    const turbidity = getMeasurementScale('TURBIDITY');

    // ASSERT
    expect(chlorophyll?.colors).toEqual(['#d5d695', '#c9c09b', '#004b43', '#003c3e']);
    expect(oxygen?.colors).toEqual(['#272d2c', '#2c3131', '#353838', '#00ff4a']);
    expect(solids?.colors).toEqual(['#80008a', '#93306c', '#b2654d', '#ca9535']);
    expect(turbidity?.colors).toEqual(['#4d004d', '#5b1546', '#5e1845', '#9a6f2b']);
  });
});
