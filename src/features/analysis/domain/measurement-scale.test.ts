import { describe, expect, it } from 'vitest';

import {
  createMeasurementGradient,
  getMeasurementDefinition,
} from './measurement-scale';

describe('measurement definitions', () => {
  it.each([
    ['CHLA', 'Chlorophyll-a', 'mg/m³'],
    ['TOTAL-SUSPENDED-SOLIDS', 'Total Suspended Solids', 'mg/L'],
    ['TURBIDITY', 'Turbidity', 'NTU'],
  ])('should define the parameter and unit for %s', (layer, parameter, unit) => {
    // ARRANGE + ACT
    const definition = getMeasurementDefinition(layer);

    // ASSERT
    expect(definition).toEqual({
      parameter,
      unit,
      minimum: 0,
      calibrationStatus: 'unavailable',
    });
  });

  it.each([
    [
      'WATER-QUALITY-CDOM',
      {
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
    ],
    [
      'WATER-QUALITY-TURBIDITY',
      {
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
    ],
    [
      'WATER-QUALITY-TSS',
      {
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
    ],
  ])('should define the scientifically bounded %s scale', (layer, expected) => {
    // ARRANGE + ACT
    const definition = getMeasurementDefinition(layer);

    // ASSERT
    expect(definition).toEqual(expected);
  });

  it('should define the configured MAGO index 0 scale', () => {
    // ARRANGE + ACT
    const definition = getMeasurementDefinition('WATER-QUALITY');

    // ASSERT
    expect(definition).toEqual({
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
    });
  });

  it('should not invent a definition for an unsupported layer', () => {
    // ARRANGE + ACT + ASSERT
    expect(getMeasurementDefinition('UNKNOWN')).toBeUndefined();
  });

  it('should derive the MAGO gradient positions from its numeric domain', () => {
    // ARRANGE
    const definition = getMeasurementDefinition('WATER-QUALITY');
    if (!definition || definition.calibrationStatus !== 'configured') {
      throw new Error('Expected the configured MAGO measurement definition');
    }

    // ACT
    const gradient = createMeasurementGradient(definition);

    // ASSERT
    expect(gradient).toBe(
      'linear-gradient(to top, #0000ff 0%, #00ffff 25%, #00ff00 50%, #ffff00 75%, #ff0000 100%)',
    );
  });

  it('should preserve the previous turbidity palette over the scientific domain', () => {
    // ARRANGE
    const definition = getMeasurementDefinition('WATER-QUALITY-TURBIDITY');
    if (!definition || definition.calibrationStatus !== 'configured') {
      throw new Error('Expected the configured turbidity definition');
    }

    // ACT + ASSERT
    expect(createMeasurementGradient(definition)).toBe(
      'linear-gradient(to top, #ea580c 0%, #f97316 25%, #eab308 50%, #8b5cf6 75%, #581c87 100%)',
    );
  });
});
