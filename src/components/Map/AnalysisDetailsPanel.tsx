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
    <aside className="oracular-panel oracular-detail-panel" aria-label={`${indicator.name} details`}>
      <div className="oracular-panel__heading">
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
      <div className="oracular-layer-details">
        {indicator.type === 'discrete' ? (
          <div className="oracular-legend-card">
            <div className="oracular-legend-label">Color classes</div>
            <div className="oracular-discrete-legend">
              {indicator.indicators.map((item, index) => (
                <div key={index} className="oracular-discrete-legend__item">
                  <span className={`oracular-discrete-legend__swatch ${item.color}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : indicator.type === 'natural' ? null : measurementScale ? (
          <div className="oracular-legend-card" aria-label="Measurement range">
            <div className="oracular-continuous-legend">
              <div className="oracular-continuous-legend__values">
                {[...measurementScale.values].reverse().map((value) => (
                  <span key={value}>{value}</span>
                ))}
              </div>
              <div className="oracular-continuous-legend__bar">
                <div
                  aria-label={`${indicator.name} color scale`}
                  style={{ backgroundImage: createMeasurementGradient(measurementScale) }}
                />
              </div>
              <div className="oracular-continuous-legend__unit">{measurementScale.unit}</div>
            </div>
          </div>
        ) : (
          <div className="oracular-legend-card">
            <div className="oracular-legend-label">Measurement range unavailable</div>
          </div>
        )}
        <p className="oracular-layer-description">{indicator.description}</p>
      </div>
      <p className="oracular-reference">{indicator.quote}</p>
    </aside>
  );
}
