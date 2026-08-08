//VERSION=3
// MAGO Water Quality Monitoring Tool - index 5 WMS visualization.
// Turbidity (NTU), based on Zhan et al. (2022).
// https://doi.org/10.23818/limn.41.18
//
// Adapted from the PRIMA MAGO Project / CETAQUA script:
// https://custom-scripts.sentinel-hub.com/sentinel-2/mago_water_quality_monitoring_tool/
// Source license: CC BY-SA 4.0. This derivative remains CC BY-SA 4.0.

var minValue = 0.1;
var maxValue = 15.89;
var scaleLimits = [
  minValue,
  (maxValue + 3 * minValue) / 4,
  (maxValue + minValue) / 2,
  (3 * maxValue + minValue) / 4,
  maxValue,
];
var colorScale = [
  [234 / 255, 88 / 255, 12 / 255],
  [249 / 255, 115 / 255, 22 / 255],
  [234 / 255, 179 / 255, 8 / 255],
  [139 / 255, 92 / 255, 246 / 255],
  [88 / 255, 28 / 255, 135 / 255],
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

  var turbidity = sample.B02 === 0
    ? maxValue
    : 194.79 * (sample.B05 * (sample.B05 / sample.B02)) + 0.9061;
  var displayTurbidity = Math.max(minValue, Math.min(maxValue, turbidity));

  return isFinite(turbidity)
    ? [...colorBlend(displayTurbidity, scaleLimits, colorScale), 1]
    : nonWaterShade;
}

function isWaterBody(sample) {
  var ndvi = index(sample.B08, sample.B04);
  var ndwi = index(sample.B03, sample.B08);
  var mndwi = index(sample.B03, sample.B11);
  var ndwiLeaves = index(sample.B08, sample.B11);
  var aweiSh = sample.B02 + 2.5 * sample.B03
    - 1.5 * (sample.B08 + sample.B11) - 0.25 * sample.B12;
  var aweiNsh = 4 * (sample.B03 - sample.B11)
    - (0.25 * sample.B08 + 2.75 * sample.B11);
  var dryBareSoilIndex = index(sample.B11, sample.B03) - ndvi;
  var indicesAreValid = isFinite(ndvi) && isFinite(ndwi) && isFinite(mndwi)
    && isFinite(ndwiLeaves) && isFinite(aweiSh) && isFinite(aweiNsh)
    && isFinite(dryBareSoilIndex);
  var waterEvidence = 0;
  waterEvidence += mndwi > 0.42 ? 1 : 0;
  waterEvidence += ndwi > 0.4 ? 1 : 0;
  waterEvidence += aweiNsh > 0.1879 ? 1 : 0;
  waterEvidence += aweiSh > 0.1112 ? 1 : 0;
  var isWaterCore = waterEvidence >= 2;
  var isTurbidWaterOrShoreline = mndwi > 0 && (ndwi > 0 || ndvi < 0);
  var isWaterCandidate = isWaterCore || isTurbidWaterOrShoreline
    || ndwiLeaves > 1;
  var isUrbanOrBareSoil = aweiNsh <= -0.03 || dryBareSoilIndex > 0;

  return indicesAreValid && isWaterCandidate && !isUrbanOrBareSoil;
}
