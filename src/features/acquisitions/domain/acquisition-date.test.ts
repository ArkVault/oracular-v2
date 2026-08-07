import { describe, expect, it } from 'vitest';

import {
  acquisitionDateToLocalDate,
  localDateToAcquisitionDate,
  toWmsDayTimeRange,
} from './acquisition-date';

describe('acquisition date conversions', () => {
  it('should round-trip a calendar date without a UTC timezone shift', () => {
    // ARRANGE
    const acquisitionDate = '2026-08-04';

    // ACT
    const result = localDateToAcquisitionDate(
      acquisitionDateToLocalDate(acquisitionDate),
    );

    // ASSERT
    expect(result).toBe(acquisitionDate);
  });

  it('should build the complete WMS UTC range for one acquisition day', () => {
    // ARRANGE
    const acquisitionDate = '2026-08-04';

    // ACT
    const result = toWmsDayTimeRange(acquisitionDate);

    // ASSERT
    expect(result).toBe('2026-08-04T00:00:00Z/2026-08-04T23:59:59Z');
  });
});
