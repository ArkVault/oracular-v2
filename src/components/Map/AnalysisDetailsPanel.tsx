import { X } from 'lucide-react';

import type { IndicatorDefinition } from './indicator-definitions';
import { PointInfoSection, type PointInfoData } from './PointInfoSection';

interface AnalysisDetailsPanelProps {
  indicator: IndicatorDefinition;
  onClearPoint: () => void;
  onClose: () => void;
  pointInfo: PointInfoData | null;
}

export function AnalysisDetailsPanel({
  indicator,
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
        ) : indicator.type === 'natural' ? null : (
          <div className="oracular-legend-card">
            <div className="oracular-legend-label">Calibrated measurement range unavailable</div>
            <p className="oracular-layer-description">
              The configured provider palette and scientific value mapping are not available.
            </p>
          </div>
        )}
        <p className="oracular-layer-description">{indicator.description}</p>
      </div>
      <p className="oracular-reference">{indicator.quote}</p>
    </aside>
  );
}
