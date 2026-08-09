import { X } from 'lucide-react';
import { useI18n } from '@/i18n/i18n';

export type PointQuality = 'Good' | 'Medium' | 'Poor' | 'Unknown';

export interface PointInfoData {
  parameter: string;
  value: number | null;
  unit?: string;
  method?: string;
  methodVersion?: string;
  valueSource:
    | 'provider-scalar'
    | 'scientific-algorithm'
    | 'calibrated-color'
    | 'spectral-proxy'
    | 'unavailable';
  isEstimate: boolean;
  confidence?: 'low' | 'medium' | 'high';
  uncertainty?: number;
  colorDistance?: number;
  isOutOfArea?: boolean;
  quality: PointQuality;
  coordinates: [number, number];
  message?: string;
  acquisitionId?: string;
  acquisitionDate?: string;
  cloudCoverage?: number;
  algorithmReference?: string;
}

interface PointInfoSectionProps {
  info: PointInfoData;
  onClose: () => void;
}

const VALUE_SOURCE_LABELS: Record<PointInfoData['valueSource'], string> = {
  'provider-scalar': 'Copernicus scalar output',
  'scientific-algorithm': 'Documented scientific algorithm',
  'calibrated-color': 'Calibrated rendered-color inversion',
  'spectral-proxy': 'Spectral proxy',
  unavailable: 'Unavailable',
};

export function PointInfoSection({ info, onClose }: PointInfoSectionProps) {
  const { t } = useI18n();
  return (
    <section
      className="oracular-point-section"
      role="region"
      aria-label={t('point.region')}
    >
      <div className="oracular-point-section__header">
        <div>
          <span>{t('point.selected')}</span>
          <h4>{t('point.title')}</h4>
        </div>
        <button type="button" onClick={onClose} aria-label={t('point.close')}>
          <X />
        </button>
      </div>

      <dl className="oracular-point-section__data">
        <div>
          <dt>{t('point.coordinates')}</dt>
          <dd>{info.coordinates[0].toFixed(4)}, {info.coordinates[1].toFixed(4)}</dd>
        </div>

        {info.isOutOfArea ? (
          <div>
              <dt>{t('point.value')}</dt>
              <dd>{t('point.outside')}</dd>
          </div>
        ) : info.value !== null ? (
          <>
            <div>
              <dt>{info.isEstimate ? t('point.estimated') : t('point.value')}</dt>
              <dd>{`${info.value.toFixed(2)} ${info.unit ?? ''}`.trim()}</dd>
            </div>
            {info.quality !== 'Unknown' && (
              <div>
                <dt>{t('point.quality')}</dt>
                <dd>{info.quality}</dd>
              </div>
            )}
          </>
        ) : !info.message ? (
          <div>
            <dt>{t('point.value')}</dt>
            <dd>{t('point.noData')}</dd>
          </div>
        ) : null}

        {info.message && (
          <div className="oracular-point-section__message">
            <dd>{info.message}</dd>
          </div>
        )}

        <div>
          <dt>{t('point.source')}</dt>
          <dd>{VALUE_SOURCE_LABELS[info.valueSource]}</dd>
        </div>
        {info.method && (
          <div>
            <dt>{t('point.method')}</dt>
            <dd>{info.method}{info.methodVersion ? ` (${info.methodVersion})` : ''}</dd>
          </div>
        )}
        {info.confidence && (
          <div>
            <dt>{t('point.confidence')}</dt>
            <dd>{info.confidence}</dd>
          </div>
        )}
        {info.colorDistance !== undefined && (
          <div>
            <dt>{t('point.color')}</dt>
            <dd>{`ΔE ${info.colorDistance.toFixed(2)}`}</dd>
          </div>
        )}

        {info.acquisitionDate && (
          <div>
            <dt>{t('point.acquisition')}</dt>
            <dd>{info.acquisitionDate}</dd>
          </div>
        )}
        {info.cloudCoverage !== undefined && (
          <div>
            <dt>{t('point.cloud')}</dt>
            <dd>{info.cloudCoverage.toFixed(2)}%</dd>
          </div>
        )}
      </dl>

      {info.acquisitionId && (
        <div className="oracular-point-section__scene">{t('point.scene')}: {info.acquisitionId}</div>
      )}
      {info.algorithmReference && (
        <a
          className="oracular-point-section__scene"
          href={info.algorithmReference}
          target="_blank"
          rel="noreferrer"
        >
          {t('point.algorithm')}
        </a>
      )}
    </section>
  );
}
