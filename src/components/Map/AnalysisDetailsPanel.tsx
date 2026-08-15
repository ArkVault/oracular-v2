import { CalendarClock, X } from 'lucide-react';

import {
  createMeasurementGradient,
  getMeasurementDefinition,
} from '@/features/analysis/domain/measurement-scale';

import type { IndicatorDefinition } from './indicator-definitions';
import { localizeIndicator } from './indicator-definitions';
import { PointInfoSection, type PointInfoData } from './PointInfoSection';
import { useI18n } from '@/i18n/i18n';

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
  const { language, locale, t } = useI18n();
  const displayIndicator = localizeIndicator(indicator, language);
  const measurement =
    indicator.type === undefined
      ? getMeasurementDefinition(indicator.layer)
      : undefined;

  return (
    <aside className="oracular-panel oracular-detail-panel" aria-label={`${displayIndicator.name} details`}>
      <div className="oracular-panel__heading">
        <h3>{displayIndicator.name}</h3>
        <button onClick={onClose} aria-label={t('detail.close')}>
          <X />
        </button>
      </div>
      <div className="oracular-acquisition-badge" aria-label={t('detail.imageAcquisition')}>
        <CalendarClock aria-hidden="true" />
        <span>{t('detail.acquired')}</span>
        {acquiredAt ? (
          <time dateTime={acquiredAt}>{formatAcquisitionTimestamp(acquiredAt, locale)}</time>
        ) : (
          <span>{t('detail.noTimestamp')}</span>
        )}
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
            <div className="oracular-legend-label">{t('detail.classes')}</div>
            <div className="oracular-discrete-legend">
              {(displayIndicator.type === 'discrete' ? displayIndicator.indicators : indicator.indicators).map((item, index) => (
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
                    {formatMeasurementValue(
                      stop.value,
                      measurement.unit === 'MCI' ? 4 : 2,
                    )} {measurement.unit}
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
            <div className="oracular-legend-label">{t('detail.noRange')}</div>
            <p className="oracular-layer-description">
              {t('detail.noPalette')}
            </p>
          </div>
        )}
        {indicator.implementationNote && (
          <div
            className="oracular-implementation-note"
            role="note"
            aria-label={indicator.type === 'natural'
              ? t('detail.efficiency')
              : t('detail.improved')}
          >
            <span>{indicator.type === 'natural'
              ? t('detail.efficiency')
              : t('detail.improved')}</span>
            <p>{displayIndicator.implementationNote}</p>
          </div>
        )}
        <p className="oracular-layer-description">{displayIndicator.description}</p>
        {(indicator.citation || indicator.additionalCitations?.length) && (
          <div className="oracular-citation">
            <span>{indicator.additionalCitations?.length
              ? t('detail.references')
              : t('detail.citation')}</span>
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
      <p className="oracular-reference">{displayIndicator.quote}</p>
      {indicator.type !== 'natural' && (
        <p
          className="oracular-qualitative-disclaimer"
          role="note"
          aria-label="Qualitative result limitation"
        >
          Results are qualitative and require regional calibration data.
        </p>
      )}
    </aside>
  );
}

function formatMeasurementValue(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    useGrouping: false,
  }).format(value);
}

function formatAcquisitionTimestamp(acquiredAt: string, locale: string): string {
  if (locale === 'en-US') {
    const timestamp = new Date(acquiredAt);
    const day = String(timestamp.getUTCDate()).padStart(2, '0');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][timestamp.getUTCMonth()];
    return `${day} ${month} ${timestamp.getUTCFullYear()} · ${timestamp.toISOString().slice(11, 19)} UTC`;
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', hour: '2-digit', hour12: false, minute: '2-digit',
    month: 'short', second: '2-digit', timeZone: 'UTC', timeZoneName: 'short', year: 'numeric',
  }).format(new Date(acquiredAt));
}
