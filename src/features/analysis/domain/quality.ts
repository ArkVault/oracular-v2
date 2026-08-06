export type WaterQuality = 'Good' | 'Medium' | 'Poor' | 'Unknown';

interface QualityPolicy {
  direction: 'lower-is-better' | 'higher-is-better';
  good: readonly [number, number];
  medium: readonly [number, number];
  poor: readonly [number, number];
}

const QUALITY_POLICIES: Readonly<Record<string, QualityPolicy>> = {
  CHLA: {
    direction: 'lower-is-better',
    good: [0, 2.5],
    medium: [2.5, 7],
    poor: [7, 10],
  },
  'DISSOLVED-OXYGEN': {
    direction: 'higher-is-better',
    good: [8, 14],
    medium: [5, 8],
    poor: [0, 5],
  },
  'TOTAL-SUSPENDED-SOLIDS': {
    direction: 'lower-is-better',
    good: [0, 30],
    medium: [30, 70],
    poor: [70, 100],
  },
  TURBIDITY: {
    direction: 'lower-is-better',
    good: [0, 15],
    medium: [15, 35],
    poor: [35, 50],
  },
};

export function classifyWaterQuality(value: number, indicatorId: string): WaterQuality {
  const policy = QUALITY_POLICIES[indicatorId];

  if (!policy || !Number.isFinite(value)) {
    return 'Unknown';
  }

  if (policy.direction === 'higher-is-better') {
    if (value >= policy.good[0]) return 'Good';
    if (value >= policy.medium[0]) return 'Medium';
    return 'Poor';
  }

  if (value <= policy.good[1]) return 'Good';
  if (value <= policy.medium[1]) return 'Medium';
  return 'Poor';
}
