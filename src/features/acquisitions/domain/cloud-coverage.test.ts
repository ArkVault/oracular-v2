import { describe, expect, it } from 'vitest';
import { isCloudCoverageEligible } from './cloud-coverage';

describe('isCloudCoverageEligible', () => {
  it('should accept coverage below 10 percent and reject the exact boundary', () => {
    // ARRANGE
    const threshold = 10;

    // ACT
    const belowThreshold = isCloudCoverageEligible(9.99, threshold);
    const exactThreshold = isCloudCoverageEligible(10, threshold);

    // ASSERT
    expect({ belowThreshold, exactThreshold }).toEqual({
      belowThreshold: true,
      exactThreshold: false,
    });
  });

  it('should reject an acquisition when cloud metadata is missing', () => {
    // ARRANGE
    const missingValues = [null, undefined] as const;

    // ACT
    const eligibility = missingValues.map((value) => isCloudCoverageEligible(value));

    // ASSERT
    expect(eligibility).toEqual([false, false]);
  });

  it('should reject invalid cloud coverage instead of treating it as usable', () => {
    // ARRANGE
    const invalidValues = [-1, 101, Number.NaN] as const;

    // ACT
    const eligibility = invalidValues.map((value) => isCloudCoverageEligible(value));

    // ASSERT
    expect(eligibility).toEqual([false, false, false]);
  });
});
