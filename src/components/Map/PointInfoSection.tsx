import { X } from 'lucide-react';

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
  return (
    <section
      className="oracular-point-section"
      role="region"
      aria-label="Selected point details"
    >
      <div className="oracular-point-section__header">
        <div>
          <span>Selected point</span>
          <h4>Point information</h4>
        </div>
        <button type="button" onClick={onClose} aria-label="Close point details">
          <X />
        </button>
      </div>

      <dl className="oracular-point-section__data">
        <div>
          <dt>Coordinates</dt>
          <dd>{info.coordinates[0].toFixed(4)}, {info.coordinates[1].toFixed(4)}</dd>
        </div>

        {info.isOutOfArea ? (
          <div>
              <dt>Value</dt>
              <dd>Out of the area of interest</dd>
          </div>
        ) : info.value !== null ? (
          <>
            <div>
              <dt>{info.isEstimate ? 'Estimated value' : 'Value'}</dt>
              <dd>{`${info.value.toFixed(2)} ${info.unit ?? ''}`.trim()}</dd>
            </div>
            {info.quality !== 'Unknown' && (
              <div>
                <dt>Quality</dt>
                <dd>{info.quality}</dd>
              </div>
            )}
          </>
        ) : !info.message ? (
          <div>
            <dt>Value</dt>
            <dd>No data available</dd>
          </div>
        ) : null}

        {info.message && (
          <div className="oracular-point-section__message">
            <dd>{info.message}</dd>
          </div>
        )}

        <div>
          <dt>Source</dt>
          <dd>{VALUE_SOURCE_LABELS[info.valueSource]}</dd>
        </div>
        {info.method && (
          <div>
            <dt>Method</dt>
            <dd>{info.method}{info.methodVersion ? ` (${info.methodVersion})` : ''}</dd>
          </div>
        )}
        {info.confidence && (
          <div>
            <dt>Confidence</dt>
            <dd>{info.confidence}</dd>
          </div>
        )}
        {info.colorDistance !== undefined && (
          <div>
            <dt>Color difference</dt>
            <dd>{`ΔE ${info.colorDistance.toFixed(2)}`}</dd>
          </div>
        )}

        {info.acquisitionDate && (
          <div>
            <dt>Acquisition</dt>
            <dd>{info.acquisitionDate}</dd>
          </div>
        )}
        {info.cloudCoverage !== undefined && (
          <div>
            <dt>Cloud cover</dt>
            <dd>{info.cloudCoverage.toFixed(2)}%</dd>
          </div>
        )}
      </dl>

      {info.acquisitionId && (
        <div className="oracular-point-section__scene">Scene: {info.acquisitionId}</div>
      )}
      {info.algorithmReference && (
        <a
          className="oracular-point-section__scene"
          href={info.algorithmReference}
          target="_blank"
          rel="noreferrer"
        >
          Algorithm reference
        </a>
      )}
    </section>
  );
}
