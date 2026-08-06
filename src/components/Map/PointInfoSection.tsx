import { X } from 'lucide-react';

export type PointQuality = 'Good' | 'Medium' | 'Poor' | 'Unknown';

export interface PointInfoData {
  value: number | null;
  valueSource?: 'color-estimate';
  isOutOfArea?: boolean;
  quality: PointQuality;
  coordinates: [number, number];
  message?: string;
  acquisitionId?: string;
  acquisitionDate?: string;
  cloudCoverage?: number;
}

interface PointInfoSectionProps {
  info: PointInfoData;
  unit?: string;
  onClose: () => void;
}

export function PointInfoSection({ info, unit, onClose }: PointInfoSectionProps) {
  return (
    <section
      className="orber-point-section"
      role="region"
      aria-label="Selected point details"
    >
      <div className="orber-point-section__header">
        <div>
          <span>Selected point</span>
          <h4>Point information</h4>
        </div>
        <button type="button" onClick={onClose} aria-label="Close point details">
          <X />
        </button>
      </div>

      <dl className="orber-point-section__data">
        <div>
          <dt>Coordinates</dt>
          <dd>{info.coordinates[0].toFixed(4)}, {info.coordinates[1].toFixed(4)}</dd>
        </div>

        {info.isOutOfArea ? (
          <div>
            <dt>Estimated value</dt>
            <dd>Out of the area of interest</dd>
          </div>
        ) : info.value !== null ? (
          <>
            <div>
              <dt>{info.valueSource === 'color-estimate' ? 'Estimated value' : 'Value'}</dt>
              <dd>{`${info.value.toFixed(2)} ${unit ?? ''}`.trim()}</dd>
            </div>
            <div>
              <dt>Quality</dt>
              <dd>{info.quality}</dd>
            </div>
          </>
        ) : !info.message ? (
          <div>
            <dt>Value</dt>
            <dd>No data available</dd>
          </div>
        ) : null}

        {info.message && (
          <div className="orber-point-section__message">
            <dd>{info.message}</dd>
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
        <div className="orber-point-section__scene">Scene: {info.acquisitionId}</div>
      )}
    </section>
  );
}
