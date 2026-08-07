import { Home, Pencil, Square, Trash2, ZoomIn, ZoomOut } from 'lucide-react';

import type { DrawMode } from './map-types';

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
  return (
    <div className="orber-map-controls" aria-label="Map controls">
      <button
        className={drawMode === 'polygon' ? 'is-active' : ''}
        onClick={() => onToggleDrawMode('polygon')}
        aria-label="Draw polygon"
      >
        <Pencil />
      </button>
      <button onClick={onZoomIn} aria-label="Zoom in">
        <ZoomIn />
      </button>
      <button
        className={drawMode === 'rectangle' ? 'is-active' : ''}
        onClick={() => onToggleDrawMode('rectangle')}
        aria-label="Draw rectangle"
      >
        <Square />
      </button>
      <button onClick={onZoomOut} aria-label="Zoom out">
        <ZoomOut />
      </button>
      <button onClick={onClearDrawings} aria-label="Clear drawings">
        <Trash2 />
      </button>
      <button onClick={onResetView} aria-label="Reset view">
        <Home />
      </button>
    </div>
  );
}
