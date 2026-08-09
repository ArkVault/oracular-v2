import { describe, expect, it } from 'vitest';

import { analysisIdentifier, validateAnalysisIndicator } from './analysis-indicator';

describe('per-indicator analysis quota identity', () => {
  it('should keep each indicator allowance independent for the same IP', () => {
    // ARRANGE
    const ipHash = 'protected-ip';

    // ACT + ASSERT
    expect(analysisIdentifier(ipHash, 'Chlorophyll-a'))
      .not.toBe(analysisIdentifier(ipHash, 'Turbidity'));
  });

  it('should reuse the same allowance for repeated requests of one indicator', () => {
    // ARRANGE + ACT + ASSERT
    expect(analysisIdentifier('protected-ip', 'CDOM'))
      .toBe(analysisIdentifier('protected-ip', 'CDOM'));
  });

  it('should reject unknown and non-indicator values', () => {
    // ARRANGE + ACT + ASSERT
    expect(validateAnalysisIndicator('Made-up indicator')).toBeNull();
    expect(validateAnalysisIndicator(undefined)).toBeNull();
  });
});
