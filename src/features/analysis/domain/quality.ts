export type WaterQuality = 'Good' | 'Medium' | 'Poor' | 'Unknown';

export function classifyWaterQuality(value: number, indicatorId: string): WaterQuality {
  // No versioned, documented classification policy is available for the
  // configured layers. Returning Unknown avoids presenting display ranges as
  // scientifically validated water-quality thresholds.
  void value;
  void indicatorId;
  return 'Unknown';
}
