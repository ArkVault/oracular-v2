import { getMeasurementScale } from './measurement-scale';

type Rgb = readonly [number, number, number];

// Allows small rendering/compression variations without projecting unrelated
// map colors onto an analytical scale.
const MAX_SCALE_COLOR_DISTANCE = 42;

function parseHexColor(color: string): Rgb {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

function normalizeRenderedChannels(channels: readonly number[]): Rgb | undefined {
  if (channels.length < 3) return undefined;

  const rgb = channels.slice(0, 3);
  if (rgb.some((channel) => !Number.isFinite(channel) || channel < 0)) {
    return undefined;
  }

  const maximum = Math.max(...rgb);
  if (maximum > 255) return undefined;

  const multiplier = maximum <= 1 ? 255 : 1;
  return [rgb[0] * multiplier, rgb[1] * multiplier, rgb[2] * multiplier];
}

function projectOntoColorSegment(
  color: Rgb,
  start: Rgb,
  end: Rgb,
): { distanceSquared: number; position: number } {
  const segment = [end[0] - start[0], end[1] - start[1], end[2] - start[2]] as Rgb;
  const offset = [color[0] - start[0], color[1] - start[1], color[2] - start[2]] as Rgb;
  const segmentLengthSquared =
    segment[0] ** 2 + segment[1] ** 2 + segment[2] ** 2;
  const rawPosition =
    segmentLengthSquared === 0
      ? 0
      : (offset[0] * segment[0] + offset[1] * segment[1] + offset[2] * segment[2]) /
        segmentLengthSquared;
  const position = Math.min(1, Math.max(0, rawPosition));
  const projected: Rgb = [
    start[0] + segment[0] * position,
    start[1] + segment[1] * position,
    start[2] + segment[2] * position,
  ];
  const distanceSquared =
    (color[0] - projected[0]) ** 2 +
    (color[1] - projected[1]) ** 2 +
    (color[2] - projected[2]) ** 2;

  return { distanceSquared, position };
}

export function estimateMeasurementFromRenderedColor(
  layer: string,
  renderedChannels: readonly number[],
): number | null | undefined {
  const scale = getMeasurementScale(layer);
  const renderedColor = normalizeRenderedChannels(renderedChannels);
  if (!scale || !renderedColor) return undefined;

  const scaleColors = scale.colors.map(parseHexColor);
  let closestDistance = Number.POSITIVE_INFINITY;
  let estimate: number | undefined;

  for (let index = 0; index < scaleColors.length - 1; index += 1) {
    const projection = projectOntoColorSegment(
      renderedColor,
      scaleColors[index],
      scaleColors[index + 1],
    );

    if (projection.distanceSquared < closestDistance) {
      const startValue = scale.values[index];
      const endValue = scale.values[index + 1];
      closestDistance = projection.distanceSquared;
      estimate = startValue + (endValue - startValue) * projection.position;
    }
  }

  return closestDistance > MAX_SCALE_COLOR_DISTANCE ** 2 ? null : estimate;
}
