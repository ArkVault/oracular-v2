//VERSION=3
// Encodes calibrated Sentinel-1 VV/VH backscatter for contextual client-side screening.
// R: VV dB from -40 to 0, G: VH dB from -45 to 0, B: dataMask.

function setup() {
  return {
    input: [{ bands: ["VV", "VH", "dataMask"], units: "LINEAR_POWER" }],
    output: { bands: 4, sampleType: "UINT8" },
  };
}

function evaluatePixel(sample) {
  if (sample.dataMask !== 1) {
    return [0, 0, 0, 0];
  }

  return [
    encodeDb(sample.VV, -40),
    encodeDb(sample.VH, -45),
    255,
    255,
  ];
}

function encodeDb(linearPower, minimumDb) {
  if (!(linearPower > 0)) return 0;
  var valueDb = (10 * Math.log(linearPower)) / Math.LN10;
  return Math.round(255 * clamp((valueDb - minimumDb) / -minimumDb));
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}
