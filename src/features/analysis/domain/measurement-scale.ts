export interface MeasurementDefinition {
  parameter: string;
  unit: string;
  minimum: number;
  calibrationStatus: 'unavailable';
}

const MEASUREMENT_DEFINITIONS: Readonly<Record<string, MeasurementDefinition>> = {
  CHLA: {
    parameter: 'Chlorophyll-a',
    unit: 'mg/m³',
    minimum: 0,
    calibrationStatus: 'unavailable',
  },
  'DISSOLVED-OXYGEN': {
    parameter: 'Dissolved Oxygen',
    unit: 'mg/L',
    minimum: 0,
    calibrationStatus: 'unavailable',
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
