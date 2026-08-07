import { getMeasurementScale } from './measurement-scale';

type Rgb = readonly [number, number, number];

// Sentinel Hub's ColorRampVisualizer interpolates continuously between ramp
// anchors. Dense sampling mirrors that behavior while remaining cheap for a
// single click.
const SAMPLES_PER_SEGMENT = 256;

// WMS rendering, transparency and image compression can change brightness
// without materially changing a ramp color. Allow a bounded gain adjustment,
// then require the chromatic residual to remain small.
const MIN_RENDER_GAIN = 0.55;
const MAX_RENDER_GAIN = 1.65;
const MAX_RELATIVE_COLOR_ERROR = 0.12;
const MAX_DIRECT_COLOR_ERROR = 12;
const MAX_NO_DATA_CHANNEL = 16;

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

function interpolateColor(start: Rgb, end: Rgb, position: number): Rgb {
  return [
    start[0] + (end[0] - start[0]) * position,
    start[1] + (end[1] - start[1]) * position,
    start[2] + (end[2] - start[2]) * position,
  ];
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
  const projected = interpolateColor(start, end, position);
  const distanceSquared =
    (color[0] - projected[0]) ** 2 +
    (color[1] - projected[1]) ** 2 +
    (color[2] - projected[2]) ** 2;

  return { distanceSquared, position };
}

function compareRenderedColor(
  rendered: Rgb,
  rampColor: Rgb,
): { gain: number; relativeError: number } {
  const rampMagnitudeSquared =
    rampColor[0] ** 2 + rampColor[1] ** 2 + rampColor[2] ** 2;
  const renderedMagnitude = Math.sqrt(
    rendered[0] ** 2 + rendered[1] ** 2 + rendered[2] ** 2,
  );
  const gain =
    rampMagnitudeSquared === 0
      ? 0
      : (rendered[0] * rampColor[0] +
          rendered[1] * rampColor[1] +
          rendered[2] * rampColor[2]) /
        rampMagnitudeSquared;
  const error = Math.sqrt(
    (rendered[0] - rampColor[0] * gain) ** 2 +
      (rendered[1] - rampColor[1] * gain) ** 2 +
      (rendered[2] - rampColor[2] * gain) ** 2,
  );

  return {
    gain,
    relativeError: renderedMagnitude === 0 ? Number.POSITIVE_INFINITY : error / renderedMagnitude,
  };
}

export function estimateMeasurementFromRenderedColor(
  layer: string,
  renderedChannels: readonly number[],
): number | null | undefined {
  const scale = getMeasurementScale(layer);
  const renderedColor = normalizeRenderedChannels(renderedChannels);
  if (!scale || !renderedColor) return undefined;

  const scaleColors = scale.colors.map(parseHexColor);
  let closestDirectDistance = Number.POSITIVE_INFINITY;
  let directEstimate: number | undefined;

  for (let index = 0; index < scaleColors.length - 1; index += 1) {
    const projection = projectOntoColorSegment(
      renderedColor,
      scaleColors[index],
      scaleColors[index + 1],
    );

    if (projection.distanceSquared < closestDirectDistance) {
      closestDirectDistance = projection.distanceSquared;
      const startValue = scale.values[index];
      const endValue = scale.values[index + 1];
      directEstimate = startValue + (endValue - startValue) * projection.position;
    }
  }

  if (closestDirectDistance <= MAX_DIRECT_COLOR_ERROR ** 2) {
    return directEstimate;
  }

  let closestError = Number.POSITIVE_INFINITY;
  let closestGain = 0;
  let estimate: number | undefined;

  for (let index = 0; index < scaleColors.length - 1; index += 1) {
    for (let sample = 0; sample <= SAMPLES_PER_SEGMENT; sample += 1) {
      const position = sample / SAMPLES_PER_SEGMENT;
      const rampColor = interpolateColor(
        scaleColors[index],
        scaleColors[index + 1],
        position,
      );
      const comparison = compareRenderedColor(renderedColor, rampColor);
      const startValue = scale.values[index];
      const endValue = scale.values[index + 1];

      if (comparison.relativeError < closestError) {
        closestError = comparison.relativeError;
        closestGain = comparison.gain;
        estimate = startValue + (endValue - startValue) * position;
      }
    }
  }

  const isRecognizedRampColor =
    closestError <= MAX_RELATIVE_COLOR_ERROR &&
    closestGain >= MIN_RENDER_GAIN &&
    closestGain <= MAX_RENDER_GAIN;

  if (isRecognizedRampColor) {
    return estimate;
  }

  return Math.max(...renderedColor) <= MAX_NO_DATA_CHANNEL ? null : undefined;
}
