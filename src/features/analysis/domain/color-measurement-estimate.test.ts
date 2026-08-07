import { describe, expect, it } from 'vitest';

import { estimateMeasurementFromRenderedColor } from './color-measurement-estimate';

describe('color-derived measurement estimate', () => {
  it('should map an exact rendered boundary color to its CHLA measurement', () => {
    // ARRANGE
    const renderedChannels = [201, 192, 155];

    // ACT
    const estimate = estimateMeasurementFromRenderedColor('CHLA', renderedChannels);

    // ASSERT
    expect(estimate).toBeCloseTo(2.5, 4);
  });

  it('should preserve the higher-is-better direction of dissolved oxygen', () => {
    // ARRANGE
    const renderedChannels = [0, 255, 74];

    // ACT
    const estimate = estimateMeasurementFromRenderedColor(
      'DISSOLVED-OXYGEN',
      renderedChannels,
    );

    // ASSERT
    expect(estimate).toBeCloseTo(14, 4);
  });

  it('should interpolate within the closest non-uniform scale segment', () => {
    // ARRANGE
    const renderedChannels = [101, 134, 111];

    // ACT
    const estimate = estimateMeasurementFromRenderedColor('CHLA', renderedChannels);

    // ASSERT
    expect(estimate).toBeCloseTo(4.75, 1);
  });

  it('should accept normalized rendered channels', () => {
    // ARRANGE
    const renderedChannels = [201 / 255, 192 / 255, 155 / 255];

    // ACT
    const estimate = estimateMeasurementFromRenderedColor('CHLA', renderedChannels);

    // ASSERT
    expect(estimate).toBeCloseTo(2.5, 4);
  });

  it('should preserve the measurement when a valid scale color is rendered darker', () => {
    // ARRANGE
    const renderedChannels = [140.7, 134.4, 108.5];

    // ACT
    const estimate = estimateMeasurementFromRenderedColor('CHLA', renderedChannels);

    // ASSERT
    expect(estimate).toBeCloseTo(2.5, 1);
  });

  it('should recover a suspended-solids value from a brightness-shifted ramp nuance', () => {
    // ARRANGE
    const renderedChannels = [106.8, 60.6, 46.2];

    // ACT
    const estimate = estimateMeasurementFromRenderedColor(
      'TOTAL-SUSPENDED-SOLIDS',
      renderedChannels,
    );

    // ASSERT
    expect(estimate).toBeCloseTo(70, 1);
  });

  it('should reject a dark rendered pixel outside the configured color scale', () => {
    // ARRANGE
    const renderedChannels = [8, 8, 8];

    // ACT
    const estimate = estimateMeasurementFromRenderedColor('CHLA', renderedChannels);

    // ASSERT
    expect(estimate).toBeNull();
  });

  it('should decline an uncalibrated saturated map color without calling it no-data', () => {
    // ARRANGE
    const renderedChannels = [20, 60, 200];

    // ACT
    const estimate = estimateMeasurementFromRenderedColor('CHLA', renderedChannels);

    // ASSERT
    expect(estimate).toBeUndefined();
  });

  it('should use the configured scales for suspended solids and turbidity', () => {
    // ARRANGE + ACT
    const solidsEstimate = estimateMeasurementFromRenderedColor(
      'TOTAL-SUSPENDED-SOLIDS',
      [178, 101, 77],
    );
    const turbidityEstimate = estimateMeasurementFromRenderedColor(
      'TURBIDITY',
      [94, 24, 69],
    );

    // ASSERT
    expect(solidsEstimate).toBeCloseTo(70, 4);
    expect(turbidityEstimate).toBeCloseTo(35, 4);
  });

  it('should decline an estimate without a measurement scale or valid RGB channels', () => {
    // ARRANGE + ACT
    const unsupportedLayer = estimateMeasurementFromRenderedColor(
      'INCENDIOS-FORESTALES',
      [132, 204, 22],
    );
    const invalidChannels = estimateMeasurementFromRenderedColor('CHLA', [132, 204]);

    // ASSERT
    expect(unsupportedLayer).toBeUndefined();
    expect(invalidChannels).toBeUndefined();
  });
});
