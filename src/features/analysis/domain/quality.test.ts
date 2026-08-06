import { describe, expect, it } from 'vitest';
import { classifyWaterQuality } from './quality';

describe('classifyWaterQuality', () => {
  it('should classify chlorophyll boundary values without gaps', () => {
    // ARRANGE
    const samples = [2.5, 2.51, 7, 7.01] as const;

    // ACT
    const qualities = samples.map((value) => classifyWaterQuality(value, 'CHLA'));

    // ASSERT
    expect(qualities).toEqual(['Good', 'Medium', 'Medium', 'Poor']);
  });

  it('should classify dissolved oxygen in the inverse quality direction', () => {
    // ARRANGE
    const samples = [8, 5, 4.99] as const;

    // ACT
    const qualities = samples.map((value) =>
      classifyWaterQuality(value, 'DISSOLVED-OXYGEN'),
    );

    // ASSERT
    expect(qualities).toEqual(['Good', 'Medium', 'Poor']);
  });

  it('should return Unknown when the indicator has no quality policy', () => {
    // ARRANGE
    const unsupportedIndicator = 'NATURAL-COLOR';

    // ACT
    const quality = classifyWaterQuality(4, unsupportedIndicator);

    // ASSERT
    expect(quality).toBe('Unknown');
  });
});
