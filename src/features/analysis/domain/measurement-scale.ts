export interface MeasurementScale {
  unit: string;
  values: readonly [number, number, number, number];
  colors: readonly [string, string, string, string];
}

const MEASUREMENT_SCALES: Readonly<Record<string, MeasurementScale>> = {
  CHLA: {
    unit: 'mg/m³',
    values: [0, 2.5, 7, 10],
    colors: ['#d5d695', '#c9c09b', '#004b43', '#003c3e'],
  },
  'DISSOLVED-OXYGEN': {
    unit: 'mg/L',
    values: [0, 5, 8, 14],
    colors: ['#272d2c', '#2c3131', '#353838', '#00ff4a'],
  },
  'TOTAL-SUSPENDED-SOLIDS': {
    unit: 'mg/L',
    values: [0, 30, 70, 100],
    colors: ['#80008a', '#93306c', '#b2654d', '#ca9535'],
  },
  TURBIDITY: {
    unit: 'NTU',
    values: [0, 15, 35, 50],
    colors: ['#4d004d', '#5b1546', '#5e1845', '#9a6f2b'],
  },
};

export function getMeasurementScale(layer: string): MeasurementScale | undefined {
  return MEASUREMENT_SCALES[layer];
}

export function createMeasurementGradient(scale: MeasurementScale): string {
  const min = scale.values[0];
  const max = scale.values[scale.values.length - 1];
  const range = max - min;
  const stops = scale.values.map((value, index) => {
    const offset = range === 0 ? 0 : ((value - min) / range) * 100;
    return `${scale.colors[index]} ${offset}%`;
  });

  return `linear-gradient(to top, ${stops.join(', ')})`;
}
