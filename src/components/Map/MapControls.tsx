import { Home, Pencil, Square, Trash2, ZoomIn, ZoomOut } from 'lucide-react';

import type { DrawMode } from './map-types';
import { useI18n } from '@/i18n/i18n';

interface MapControlsProps {
  drawMode: DrawMode;
  onClearDrawings: () => void;
  onResetView: () => void;
  onToggleDrawMode: (mode: Exclude<DrawMode, null>) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function MapControls({
  drawMode,
  onClearDrawings,
  onResetView,
  onToggleDrawMode,
  onZoomIn,
  onZoomOut,
}: MapControlsProps) {
  const { t } = useI18n();
  return (
    <div className="oracular-map-controls" aria-label={t('map.controls')}>
      <button
        className={drawMode === 'polygon' ? 'is-active' : ''}
        onClick={() => onToggleDrawMode('polygon')}
        aria-label={t('map.polygon')}
      >
        <Pencil />
      </button>
      <button onClick={onZoomIn} aria-label={t('map.zoomIn')}>
        <ZoomIn />
      </button>
      <button
        className={drawMode === 'rectangle' ? 'is-active' : ''}
        onClick={() => onToggleDrawMode('rectangle')}
        aria-label={t('map.rectangle')}
      >
        <Square />
      </button>
      <button onClick={onZoomOut} aria-label={t('map.zoomOut')}>
        <ZoomOut />
      </button>
      <button onClick={onClearDrawings} aria-label={t('map.clear')}>
        <Trash2 />
      </button>
      <button onClick={onResetView} aria-label={t('map.reset')}>
        <Home />
      </button>
    </div>
  );
}
