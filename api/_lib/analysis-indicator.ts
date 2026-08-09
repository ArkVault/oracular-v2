const INDICATOR_KEYS = {
  'Chlorophyll-a': 'chlorophyll-a',
  CDOM: 'cdom',
  'Forest Fire Detection': 'forest-fire',
  'Oil Spill Detection': 'oil-spill',
  'Sargassum Detection': 'sargassum',
  'Total Suspended Solids': 'tss',
  Turbidity: 'turbidity',
} as const;

export type AnalysisIndicator = keyof typeof INDICATOR_KEYS;

export function validateAnalysisIndicator(value: unknown): AnalysisIndicator | null {
  return typeof value === 'string' && value in INDICATOR_KEYS
    ? value as AnalysisIndicator
    : null;
}

export function analysisIdentifier(ipHash: string, indicator: AnalysisIndicator): string {
  return `${ipHash}:${INDICATOR_KEYS[indicator]}`;
}
