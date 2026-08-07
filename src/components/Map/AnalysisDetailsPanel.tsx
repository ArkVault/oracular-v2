import { X } from 'lucide-react';

import {
  createMeasurementGradient,
  type MeasurementScale,
} from '@/features/analysis/domain/measurement-scale';

import type { IndicatorDefinition } from './indicator-definitions';
import { PointInfoSection, type PointInfoData } from './PointInfoSection';

interface AnalysisDetailsPanelProps {
  indicator: IndicatorDefinition;
  measurementScale?: MeasurementScale;
  onClearPoint: () => void;
  onClose: () => void;
  pointInfo: PointInfoData | null;
}

export function AnalysisDetailsPanel({
  indicator,
  measurementScale,
  onClearPoint,
  onClose,
  pointInfo,
}: AnalysisDetailsPanelProps) {
  return (
    <aside className="orber-panel orber-detail-panel" aria-label={`${indicator.name} details`}>
      <div className="orber-panel__heading">
        <h3>{indicator.name}</h3>
        <button onClick={onClose} aria-label="Close details">
          <X />
        </button>
      </div>
      {pointInfo && (
        <PointInfoSection
          info={pointInfo}
          unit={measurementScale?.unit}
          onClose={onClearPoint}
        />
      )}
      <div className="orber-layer-details">
        {indicator.type === 'discrete' ? (
          <div className="orber-legend-card">
            <div className="orber-legend-label">Color classes</div>
            <div className="orber-discrete-legend">
              {indicator.indicators.map((item, index) => (
                <div key={index} className="orber-discrete-legend__item">
                  <span className={`orber-discrete-legend__swatch ${item.color}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : indicator.type === 'natural' ? null : measurementScale ? (
          <div className="orber-legend-card" aria-label="Measurement range">
            <div className="orber-continuous-legend">
              <div className="orber-continuous-legend__values">
                {[...measurementScale.values].reverse().map((value) => (
                  <span key={value}>{value}</span>
                ))}
              </div>
              <div className="orber-continuous-legend__bar">
                <div
                  aria-label={`${indicator.name} color scale`}
                  style={{ backgroundImage: createMeasurementGradient(measurementScale) }}
                />
              </div>
              <div className="orber-continuous-legend__unit">{measurementScale.unit}</div>
            </div>
          </div>
        ) : (
          <div className="orber-legend-card">
            <div className="orber-legend-label">Measurement range unavailable</div>
          </div>
        )}
        <p className="orber-layer-description">{indicator.description}</p>
      </div>
      <p className="orber-reference">{indicator.quote}</p>
    </aside>
  );
}
