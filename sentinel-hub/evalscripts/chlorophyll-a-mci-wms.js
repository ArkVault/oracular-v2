//VERSION=3
// Sentinel-2 Chlorophyll-a qualitative Maximum Chlorophyll Index (MCI).
//
// Adapted from the Ulyssys Water Quality Viewer by Zlinszky and
// Padanyi-Gulyas. This WMS variant intentionally selects only the Sentinel-2
// chlorophyll branch: the source script's optional TSS blending is disabled so
// the displayed palette remains traceable to MCI alone.
// Source: https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ulyssys_water_quality_viewer/
// License: CC BY-SA 4.0.

var MCI_MINIMUM = -0.005;
var MCI_MAXIMUM = 0.05;
var MCI_RED_WEIGHT = (0.74 - 0.705) / (0.74 - 0.665);
var MCI_RED_EDGE_WEIGHT = 1 - MCI_RED_WEIGHT;
var MCI_STOPS = [
  MCI_MINIMUM,
  MCI_MINIMUM + (MCI_MAXIMUM - MCI_MINIMUM) / 3,
  (MCI_MINIMUM + MCI_MAXIMUM) / 2,
  MCI_MAXIMUM - (MCI_MAXIMUM - MCI_MINIMUM) / 3,
  MCI_MAXIMUM,
];
var MCI_COLORS = [
  [0.0034, 0.0142, 0.163],
  [0, 0.416, 0.306],
  [0.486, 0.98, 0],
  [0.9465, 0.8431, 0.1048],
  [1, 0, 0],
];
var NON_TARGET = [0.02, 0.025, 0.03, 0.84];

function setup() {
  return {
    input: [{
      bands: ["B03", "B04", "B05", "B06", "B07", "B08", "B8A", "B09", "B11", "CLM", "dataMask"],
    }],
    output: { bands: 4 },
  };
}

function evaluatePixel(sample) {
  if (sample.dataMask !== 1) {
    return [0, 0, 0, 0];
  }

  var denominator = sample.B03 + sample.B08;
  var ndwi = denominator === 0 ? NaN : (sample.B03 - sample.B08) / denominator;
  var isClearWater = sample.CLM === 0
    && isFinite(ndwi)
    && ndwi >= 0 && isHollsteinPureWater(sample);
  if (!isClearWater) {
    return NON_TARGET;
  }

  var mci = sample.B05 - MCI_RED_WEIGHT * sample.B04
    - MCI_RED_EDGE_WEIGHT * sample.B06;
  if (!isFinite(mci)) {
    return NON_TARGET;
  }

  return [...colorBlend(mci, MCI_STOPS, MCI_COLORS), 1];
}

function isHollsteinPureWater(sample) {
  return sample.B03 < 0.319
    && sample.B8A < 0.166
    && sample.B03 - sample.B07 >= 0.027
    && sample.B09 - sample.B11 < 0.021;
}
