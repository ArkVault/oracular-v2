interface MeasurementDefinitionBase {
  parameter: string;
  unit: string;
  minimum: number;
}

export interface UnavailableMeasurementDefinition extends MeasurementDefinitionBase {
  calibrationStatus: 'unavailable';
}

export interface ConfiguredMeasurementDefinition extends MeasurementDefinitionBase {
  calibrationStatus: 'configured';
  maximum: number;
  method: string;
  methodVersion: string;
  algorithmReference: string;
  stops: ReadonlyArray<{ value: number; color: string }>;
}

export type MeasurementDefinition =
  | UnavailableMeasurementDefinition
  | ConfiguredMeasurementDefinition;

const MEASUREMENT_DEFINITIONS: Readonly<Record<string, MeasurementDefinition>> = {
  CHLA: {
    parameter: 'Chlorophyll-a',
    unit: 'mg/m³',
    minimum: 0,
    calibrationStatus: 'unavailable',
  },
  'WATER-QUALITY': {
    parameter: 'Water Quality',
    unit: 'mg/m³',
    minimum: 0,
    maximum: 30,
    calibrationStatus: 'configured',
    method: 'MAGO index 0 — Chlorophyll-a (NDCI)',
    methodVersion: 'mago-index-0-v1',
    algorithmReference:
      'https://custom-scripts.sentinel-hub.com/sentinel-2/mago_water_quality_monitoring_tool/',
    stops: [
      { value: 0, color: '#0000ff' },
      { value: 7.5, color: '#00ffff' },
      { value: 15, color: '#00ff00' },
      { value: 22.5, color: '#ffff00' },
      { value: 30, color: '#ff0000' },
    ],
  },
  'WATER-QUALITY-CDOM': {
    parameter: 'CDOM',
    unit: 'µg/L QSE',
    minimum: 0.03,
    maximum: 5.3,
    calibrationStatus: 'configured',
    method: 'MAGO index 6 — CDOM',
    methodVersion: 'mago-index-6-soria-perpinya-2021-v1',
    algorithmReference: 'https://doi.org/10.3390/w13050686',
    stops: [
      { value: 0.03, color: '#0000ff' },
      { value: 1.3475, color: '#00ffff' },
      { value: 2.665, color: '#00ff00' },
      { value: 3.9825, color: '#ffff00' },
      { value: 5.3, color: '#ff0000' },
    ],
  },
  'WATER-QUALITY-TURBIDITY': {
    parameter: 'Turbidity',
    unit: 'NTU',
    minimum: 0.1,
    maximum: 15.89,
    calibrationStatus: 'configured',
    method: 'MAGO index 5 — Turbidity',
    methodVersion: 'mago-index-5-zhan-2022-v1',
    algorithmReference: 'https://doi.org/10.23818/limn.41.18',
    stops: [
      { value: 0.1, color: '#ea580c' },
      { value: 4.0475, color: '#f97316' },
      { value: 7.995, color: '#eab308' },
      { value: 11.9425, color: '#8b5cf6' },
      { value: 15.89, color: '#581c87' },
    ],
  },
  'WATER-QUALITY-TSS': {
    parameter: 'Total Suspended Solids',
    unit: 'mg/L',
    minimum: 20,
    maximum: 78.82,
    calibrationStatus: 'configured',
    method: 'MAGO index 7 — Total Suspended Solids',
    methodVersion: 'mago-index-7-soria-perpinya-2021-v1',
    algorithmReference: 'https://doi.org/10.3390/w13050686',
    stops: [
      { value: 20, color: '#0000ff' },
      { value: 34.705, color: '#00ffff' },
      { value: 49.41, color: '#00ff00' },
      { value: 64.115, color: '#ffff00' },
      { value: 78.82, color: '#ff0000' },
    ],
  },
  'TOTAL-SUSPENDED-SOLIDS': {
    parameter: 'Total Suspended Solids',
    unit: 'mg/L',
    minimum: 0,
    calibrationStatus: 'unavailable',
  },
  TURBIDITY: {
    parameter: 'Turbidity',
    unit: 'NTU',
    minimum: 0,
    calibrationStatus: 'unavailable',
  },
};

export function getMeasurementDefinition(layer: string): MeasurementDefinition | undefined {
  return MEASUREMENT_DEFINITIONS[layer];
}

export function createMeasurementGradient(
  definition: ConfiguredMeasurementDefinition,
): string {
  const span = definition.maximum - definition.minimum;
  const stops = definition.stops.map(({ color, value }) => {
    const position = span === 0 ? 0 : ((value - definition.minimum) / span) * 100;
    return `${color} ${position}%`;
  });

  return `linear-gradient(to top, ${stops.join(', ')})`;
}
