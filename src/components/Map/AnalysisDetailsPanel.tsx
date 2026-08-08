import { CalendarClock, X } from 'lucide-react';

import {
  createMeasurementGradient,
  getMeasurementDefinition,
} from '@/features/analysis/domain/measurement-scale';

import type { IndicatorDefinition } from './indicator-definitions';
import { PointInfoSection, type PointInfoData } from './PointInfoSection';

interface AnalysisDetailsPanelProps {
  acquiredAt?: string;
  indicator: IndicatorDefinition;
  onClearPoint: () => void;
  onClose: () => void;
  pointInfo: PointInfoData | null;
}

export function AnalysisDetailsPanel({
  acquiredAt,
  indicator,
  onClearPoint,
  onClose,
  pointInfo,
}: AnalysisDetailsPanelProps) {
  const measurement =
    indicator.type === undefined
      ? getMeasurementDefinition(indicator.layer)
      : undefined;

  return (
    <aside className="oracular-panel oracular-detail-panel" aria-label={`${indicator.name} details`}>
      <div className="oracular-panel__heading">
        <h3>{indicator.name}</h3>
        <button onClick={onClose} aria-label="Close details">
          <X />
        </button>
      </div>
      {indicator.type !== 'natural' && (
        <div className="oracular-acquisition-badge" aria-label="Image acquisition">
          <CalendarClock aria-hidden="true" />
          <span>Acquired</span>
          {acquiredAt ? (
            <time dateTime={acquiredAt}>{formatAcquisitionTimestamp(acquiredAt)}</time>
          ) : (
            <span>Timestamp unavailable</span>
          )}
        </div>
      )}
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
        ) : indicator.type === 'natural' ? null : measurement?.calibrationStatus === 'configured' ? (
          <div className="oracular-legend-card">
            <div className="oracular-legend-label">{measurement.method}</div>
            <div
              className="oracular-continuous-legend"
              role="img"
              aria-label={`${indicator.name} color scale`}
            >
              <div className="oracular-continuous-legend__values">
                {[...measurement.stops].reverse().map((stop) => (
                  <span key={stop.value}>
                    {formatMeasurementValue(stop.value)} {measurement.unit}
                  </span>
                ))}
              </div>
              <div className="oracular-continuous-legend__bar">
                <div style={{ background: createMeasurementGradient(measurement) }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="oracular-legend-card">
            <div className="oracular-legend-label">Calibrated measurement range unavailable</div>
            <p className="oracular-layer-description">
              The configured provider palette and scientific value mapping are not available.
            </p>
          </div>
        )}
        {indicator.implementationNote && (
          <div
            className="oracular-implementation-note"
            role="note"
            aria-label="Oracular improved index implementation"
          >
            <span>Improved index implementation by Oracular</span>
            <p>{indicator.implementationNote}</p>
          </div>
        )}
        <p className="oracular-layer-description">{indicator.description}</p>
        {(indicator.citation || indicator.additionalCitations?.length) && (
          <div className="oracular-citation">
            <span>{indicator.additionalCitations?.length
              ? 'Scientific references'
              : 'Scientific citation'}</span>
            {[...(indicator.citation ? [indicator.citation] : []),
              ...(indicator.additionalCitations ?? [])].map((citation) => (
              <a
                key={citation.href}
                href={citation.href}
                target="_blank"
                rel="noreferrer"
              >
                {citation.label}
              </a>
            ))}
          </div>
        )}
      </div>
      <p className="oracular-reference">{indicator.quote}</p>
    </aside>
  );
}

function formatMeasurementValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

function formatAcquisitionTimestamp(acquiredAt: string): string {
  const timestamp = new Date(acquiredAt);
  const day = String(timestamp.getUTCDate()).padStart(2, '0');
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][timestamp.getUTCMonth()];
  const time = timestamp.toISOString().slice(11, 19);

  return `${day} ${month} ${timestamp.getUTCFullYear()} · ${time} UTC`;
}
