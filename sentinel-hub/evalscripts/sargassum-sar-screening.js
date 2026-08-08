//VERSION=3
// Sentinel-1 GRD coastal Sargassum positive-contrast screening.
// SARgassum index: 0.1 * sigma0_VV + 3 * sigma0_VH (Biermann et al.).
// This per-pixel WMS visualization is not the paper's full CFAR detector and
// cannot replace an external coastline mask or confirm Sargassum.

var waterMaxVvDb = -15;
var waterMaxVhDb = -22.9;
var conservativeWaterAnchorVvDb = -17;
var positiveContrastMaxVhDb = -20;
var nonTargetShade = [0.015, 0.018, 0.022, 0.88];
var marineWaterShade = [0.008, 0.035, 0.055, 0.36];
var lowSignalShade = [1, 0.72, 0.08];
var highSignalShade = [0.98, 0.18, 0.55];
var minSarGassum = 0.1 * dbToLinear(conservativeWaterAnchorVvDb)
  + 3 * dbToLinear(waterMaxVhDb);
var maxSarGassum = 0.1 * dbToLinear(conservativeWaterAnchorVvDb)
  + 3 * dbToLinear(positiveContrastMaxVhDb);

function setup() {
  return {
    input: [{ bands: ["VV", "VH", "dataMask"], units: "LINEAR_POWER" }],
    output: { bands: 4 },
  };
}

function evaluatePixel(sample) {
  if (sample.dataMask !== 1) {
    return [0, 0, 0, 0];
  }

  var vvDb = toDb(sample.VV);
  var vhDb = toDb(sample.VH);
  var isFiniteBackscatter = isFinite(vvDb) && isFinite(vhDb);
  var isInsideMarineEnvelope = isFiniteBackscatter
    && vvDb <= conservativeWaterAnchorVvDb
    && vhDb <= positiveContrastMaxVhDb;

  if (!isInsideMarineEnvelope) {
    return nonTargetShade;
  }

  // Normal smooth water, including typical river returns, stays background.
  // VV remains a conservative water anchor. A candidate must rise above the
  // published VH water-background limit without becoming a bright land return.
  var hasPositiveMarineContrast = vvDb <= conservativeWaterAnchorVvDb
    && vhDb > waterMaxVhDb && vhDb <= positiveContrastMaxVhDb;
  if (!hasPositiveMarineContrast) {
    return marineWaterShade;
  }

  var sarGassum = 0.1 * sample.VV + 3 * sample.VH;
  var strength = Math.max(0, Math.min(
    1,
    (sarGassum - minSarGassum) / (maxSarGassum - minSarGassum)
  ));

  return [
    mix(lowSignalShade[0], highSignalShade[0], strength),
    mix(lowSignalShade[1], highSignalShade[1], strength),
    mix(lowSignalShade[2], highSignalShade[2], strength),
    0.95,
  ];
}

function toDb(linearPower) {
  return linearPower > 0
    ? (10 * Math.log(linearPower)) / Math.LN10
    : -Infinity;
}

function dbToLinear(decibels) {
  return Math.pow(10, decibels / 10);
}

function mix(start, end, amount) {
  return start + (end - start) * amount;
}
