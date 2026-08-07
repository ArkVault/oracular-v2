import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import './leaflet-draw-override.css';

interface DrawControlProps {
  drawMode: 'polygon' | 'rectangle' | null;
  clearSignal: number;
  onSave: (kml: string) => void;
  onDrawingComplete: () => void;
}

export function DrawControl({
  drawMode,
  clearSignal,
  onSave,
  onDrawingComplete,
}: DrawControlProps) {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    drawnItemsRef.current = drawnItems;
    map.addLayer(drawnItems);

    const handleCreated: L.LeafletEventHandlerFn = (event) => {
      const createdEvent = event as L.DrawEvents.Created;
      drawnItems.addLayer(createdEvent.layer);
      onDrawingComplete();
      onSave('<kml>Placeholder KML content</kml>');
    };

    map.on(L.Draw.Event.CREATED, handleCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.removeLayer(drawnItems);
      drawnItemsRef.current = null;
    };
  }, [map, onDrawingComplete, onSave]);

  useEffect(() => {
    if (!drawMode) return;

    const drawMap = map as L.DrawMap;
    const handler =
      drawMode === 'rectangle'
        ? new L.Draw.Rectangle(drawMap)
        : new L.Draw.Polygon(drawMap);

    handler.enable();
    return () => {
      handler.disable();
    };
  }, [drawMode, map]);

  useEffect(() => {
    if (clearSignal > 0) {
      drawnItemsRef.current?.clearLayers();
    }
  }, [clearSignal]);

  return null;
}
