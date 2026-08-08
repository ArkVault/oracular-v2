//VERSION=3
// Sentinel-1 GRD marine oil-like dark-return screening.
// This is a screening visualization, not confirmed oil-spill classification.
// Sentinel-1 source: VV+VH dual polarization, LINEAR_POWER.
// Candidate threshold: VV <= -25 dB (Habibie et al., 2025).

var oilLikeVvThresholdDb = -25;
// Dual-polarization permanent-water thresholds from Bauer-Marschallinger et al.
// (2021), applied with logical AND for higher land-rejection precision.
var waterMaxVvDb = -15;
var waterMaxVhDb = -22.9;
var nonTargetShade = [0.015, 0.018, 0.022, 0.86];
var waterShade = [0.012, 0.045, 0.065, 0.38];
var candidateShade = [0.94, 0.267, 0.267, 0.95];

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
  var isSarWater = isFinite(vvDb) && isFinite(vhDb)
    && vvDb <= waterMaxVvDb && vhDb <= waterMaxVhDb;

  if (!isSarWater) {
    return nonTargetShade;
  }

  return vvDb <= oilLikeVvThresholdDb ? candidateShade : waterShade;
}

function toDb(linearPower) {
  return linearPower > 0
    ? (10 * Math.log(linearPower)) / Math.LN10
    : -Infinity;
}
