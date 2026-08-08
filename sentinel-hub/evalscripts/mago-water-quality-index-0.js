//VERSION=3
// MAGO Water Quality Monitoring Tool — index 0.
// Chlorophyll-a (mg/m³) from NDCI, based on Mishra & Mishra (2012).
//
// Adapted from the PRIMA MAGO Project / CETAQUA script:
// https://custom-scripts.sentinel-hub.com/sentinel-2/mago_water_quality_monitoring_tool/
// Source license: CC BY-SA 4.0. This derivative remains CC BY-SA 4.0.
//
// Collection requirement: Sentinel-2 L2A.
// Analytical domain: clear surface-water pixels accepted by the conservative
// WBM consensus of NDWI, MNDWI, AWEIsh, and AWEInsh.

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

function setup() {
  return {
    input: ["B02", "B03", "B04", "B05", "B08", "B11", "B12", "SCL", "dataMask"],
    output: [
      { id: "default", bands: 4 },
      { id: "index", bands: 1, sampleType: "FLOAT32" },
      { id: "eobrowserStats", bands: 2, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 },
    ],
  };
}

function evaluatePixel(sample) {
  var denominator = sample.B05 + sample.B04;
  var ndci = denominator === 0 ? NaN : (sample.B05 - sample.B04) / denominator;
  var chlorophyll = 14.039 + 86.11 * ndci + 194.325 * Math.pow(ndci, 2);
  var isWater = isWaterBody(sample);
  var hasValue = sample.dataMask === 1 && isWater && !isCloud(sample.SCL) && isFinite(chlorophyll);
  var value = hasValue ? chlorophyll : NaN;
  var visualization = hasValue
    ? [...colorBlend(chlorophyll, scaleLimits, colorScale), 1]
    : [0, 0, 0, 0];

  return {
    default: visualization,
    index: [value],
    eobrowserStats: [value, isCloud(sample.SCL) ? 1 : 0],
    dataMask: [sample.dataMask],
  };
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

function isCloud(scl) {
  return scl === 1 || scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11;
}
