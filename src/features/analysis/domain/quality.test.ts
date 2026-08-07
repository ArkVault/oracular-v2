import { describe, expect, it } from 'vitest';

import { classifyWaterQuality } from './quality';

describe('classifyWaterQuality', () => {
  it('should not classify a scalar without a documented versioned policy', () => {
    // ARRANGE + ACT
    const quality = classifyWaterQuality(4.2, 'CHLA');

    // ASSERT
    expect(quality).toBe('Unknown');
  });
});
