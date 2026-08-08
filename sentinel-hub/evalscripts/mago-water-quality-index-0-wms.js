//VERSION=3
// MAGO Water Quality Monitoring Tool - index 0 WMS visualization.
// Chlorophyll-a (mg/m3) from NDCI, based on Mishra & Mishra (2012).
//
// Adapted from the PRIMA MAGO Project / CETAQUA script:
// https://custom-scripts.sentinel-hub.com/sentinel-2/mago_water_quality_monitoring_tool/
// Source license: CC BY-SA 4.0. This derivative remains CC BY-SA 4.0.
//
// This WMS-only variant uses Sentinel Hub's L1C CLM band to reject clouds and
// combines the WBM script's NDWI, MNDWI, AWEIsh, and AWEInsh thresholds with
// its urban/bare-soil rejection filter to limit the overlay to clear water.

var minValue = 0;
var maxValue = 30;
var scaleLimits = [
  minValue,
  (maxValue + 3 * minValue) / 4,
  (maxValue + minValue) / 2,
  (3 * maxValue + minValue) / 4,
  maxValue,
];
var colorScale = [
  [0, 0, 1],
  [0, 1, 1],
  [0, 1, 0],
  [1, 1, 0],
  [1, 0, 0],
];
var nonWaterShade = [0.02, 0.025, 0.03, 0.82];

function setup() {
  return {
    input: ["B02", "B03", "B04", "B05", "B08", "B11", "B12", "CLM", "dataMask"],
    output: { bands: 4 },
  };
}

function evaluatePixel(sample) {
  if (sample.dataMask !== 1) {
    return [0, 0, 0, 0];
  }

  var isClearWater = sample.CLM === 0 && isWaterBody(sample);
  if (!isClearWater) {
    return nonWaterShade;
  }

  var denominator = sample.B05 + sample.B04;
  var ndci = denominator === 0 ? NaN : (sample.B05 - sample.B04) / denominator;
  var chlorophyll = 14.039 + 86.11 * ndci + 194.325 * Math.pow(ndci, 2);
  var isValidEstimate = isFinite(chlorophyll)
    && chlorophyll >= minValue && chlorophyll <= maxValue;

  return isValidEstimate
    ? [...colorBlend(chlorophyll, scaleLimits, colorScale), 1]
    : nonWaterShade;
}

function isWaterBody(sample) {
  var ndvi = index(sample.B08, sample.B04);
  var ndwi = index(sample.B03, sample.B08);
  var mndwi = index(sample.B03, sample.B11);
  var aweiSh = sample.B02 + 2.5 * sample.B03
    - 1.5 * (sample.B08 + sample.B11) - 0.25 * sample.B12;
  var aweiNsh = 4 * (sample.B03 - sample.B11)
    - (0.25 * sample.B08 + 2.75 * sample.B12);
  var dryBareSoilIndex = index(sample.B11, sample.B03) - ndvi;
  var indicesAreValid = isFinite(ndvi) && isFinite(ndwi) && isFinite(mndwi)
    && isFinite(aweiSh) && isFinite(aweiNsh) && isFinite(dryBareSoilIndex);
  var isCandidate = mndwi > 0.42
    || ndwi > 0.4
    || aweiNsh > 0.1879
    || aweiSh > 0.1112
    || ndvi < -0.2;
  var isUrbanOrBareSoil = aweiNsh <= -0.03 || dryBareSoilIndex > 0;

  return indicesAreValid && isCandidate && !isUrbanOrBareSoil;
}
