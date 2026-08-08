# MAGO Water Quality index

Status: application integration complete; rendered through the existing Sentinel-2
L1C `CHLA` layer with a visualization-only MAGO evalscript supplied per WMS request.

## Implemented scope

The `Dissolved Oxygen` application indicator is replaced by `Water Quality`.
The indicator exposes the four requested MAGO options: index `0` Chlorophyll-a
(NDCI), index `6` CDOM, index `5` Turbidity, and index `7` Total Suspended
Solids. All four requested indices are available. Turbidity and TSS are not
duplicated as top-level indicators.

The available index retains the logical analysis identifier `WATER-QUALITY` and
uses the default MAGO index `0` configuration. For rendering, it targets the existing
Sentinel-2 L1C `CHLA` layer and overrides its visualization with the MAGO
evalscript through the Base64-encoded WMS `EVALSCRIPT` parameter:

- MAGO index number: `0`
- Parameter: surface chlorophyll-a
- Unit: `mg/m³`
- Algorithm: NDCI polynomial adapted from Mishra and Mishra (2012)
- Display domain: `0` to `30 mg/m³`
- Display stops: `0`, `7.5`, `15`, `22.5`, and `30 mg/m³`
- Collection requirement: Sentinel-2 L2A
- Water mask: Sentinel Hub WBM candidate thresholds for NDWI, MNDWI, AWEIsh,
  AWEInsh, and NDVI, followed by the WBM urban/bare-soil rejection filter
- Cloud flags: Sentinel-2 SCL classes `1`, `3`, `8`, `9`, `10`, and `11`
- WMS cloud mask: Sentinel Hub `CLM` equal to `0` (clear)
- Overlay behavior: clouds and rejected observed pixels are darkened; true
  missing data (`dataMask=0`) remains transparent

The versioned script is stored at
`sentinel-hub/evalscripts/mago-water-quality-index-0.js`.

### Index 6: CDOM

- Formula: `2.4072 * (B04 / B02) + 0.0709`
- Unit: `µg/L QSE` (quinine sulphate equivalents)
- Published domain: `0.03` to `5.30 µg/L QSE`
- Published fit: R² `0.52`, RMSE `0.88 µg/L QSE`
- Display stops: equal intervals across the published domain
- Source: Sòria-Perpinyà et al. (2021), https://doi.org/10.3390/w13050686
- WMS script: `sentinel-hub/evalscripts/mago-water-quality-index-6-wms.js`

### Index 5: Turbidity

- Formula: `194.79 * (B05 * (B05 / B02)) + 0.9061`
- Unit: `NTU`
- Published calibration/validation domain: `0.10` to `15.89 NTU`
- Published validation: RMSE `1.5 NTU`, NRMSE `10.9%`, R² `0.7303`
- Display palette: restored orange→yellow→violet→purple Turbidity ramp,
  redistributed at equal intervals across the published domain
- Isolation behavior: clear water receives the scientific index colors; land,
  cloud, urban, and bare-soil pixels are covered by a dark semitransparent mask;
  true `dataMask=0` remains transparent
- Water-body coverage: a two-signal core drawn from MNDWI, NDWI, AWEIsh, and
  AWEInsh is supplemented by a turbid-water/shoreline path using positive MNDWI
  together with positive NDWI or negative NDVI. These natural zero boundaries
  avoid another scene-specific fitted threshold. NDWI-leaves remains as the WBM
  fallback. This retains rivers, shoreline pixels, lakes, lagoons, and coastal
  water without accepting every isolated single-index response.
- Turbidity false-positive control: the recommended WBM urban/bare-soil filter
  remains active. AWEInsh uses the documented SWIR1 (`B11`) equation, and the
  Copernicus cloud mask is applied first. The
  optional WBM shadow/snow filter is disabled because its documentation warns
  that it can also remove water bodies in single-scene analysis.
- Display-domain behavior: finite estimates below `0.10` or above `15.89 NTU`
  are saturated at the nearest palette endpoint instead of being rendered as
  non-water. An endpoint color therefore means “at or beyond the calibrated
  limit”; it does not extend the quantitative validity of the published model.
  A confirmed water pixel with `B02=0`, where the ratio is undefined, is also
  shown at the upper endpoint rather than being visually reclassified as land.
- Provider limitation: the configured WMS layers use Sentinel-2 Level-1C and
  reject `SCL` because that collection has no scene-classification band. Exact
  continuous hydrographic masking therefore requires a Level-2A layer with SCL
  or an independent river/lake/coast boundary dataset.
- Water-mask source: Sentinel Hub Water Bodies Mapping (WBM),
  https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/water_bodies_mapping-wbm/
- Source: Zhan et al. (2022), https://doi.org/10.23818/limn.41.18
- WMS script: `sentinel-hub/evalscripts/mago-water-quality-index-5-wms.js`

### Index 7: Total Suspended Solids

- Formula: `14.464 * (B07 / B02) + 16.336`
- Unit: `mg/L`
- Applicable regime: high TSS, with `B07 / B02 > 0.8`
- Published model domain: `20.00` to `78.82 mg/L`
- Published all-data fit for this high-range model: R² `0.77`, RMSE `10.35 mg/L`
- Display stops: equal intervals across the published domain
- Source: Sòria-Perpinyà et al. (2021), https://doi.org/10.3390/w13050686
- WMS script: `sentinel-hub/evalscripts/mago-water-quality-index-7-wms.js`

The Water Quality evalscripts use a common two-stage pipeline. Stage 1 applies
`dataMask`, `CLM`, and the WBM spectral classifier, including urban/bare-soil
rejection. Rejected observed pixels are rendered with the same dark
semitransparent shade in every parameter, while true no-data remains
transparent. Stage 2 calculates the selected formula and accepts only finite
values inside its documented domain. TSS also requires `B07/B02 > 0.8`.

The continuous colors are visualization ramps, not water-quality classes.
Out-of-domain values are darkened instead of being clamped to a misleading
endpoint color.

## Sentinel Hub rendering

The public WMS instance does not advertise a dedicated `WATER-QUALITY` layer or
an L2A layer, but it does advertise the Sentinel-2 L1C `CHLA` layer. Sentinel
Hub supports a Base64-encoded custom
`EVALSCRIPT` parameter on WMS `GetMap` requests, so the application uses `CHLA`
as the configured data source and applies
the selected versioned MAGO WMS evalscript to every Water Quality tile request.
These rendering-only variants preserve each documented formula and its palette, replace the
original single-index mask with the Sentinel Hub Water Bodies Mapping (WBM)
classifier, and uses the L1C `CLM` band to reject clouds. WBM combines NDWI,
MNDWI, AWEIsh, AWEInsh, and NDVI, then applies its urban/bare-soil rejection
filter.
The scripts omit SCL and statistical outputs because SCL is not available in
L1C. Only clear pixels accepted by WBM and by the selected parameter's validity
rules are colored; other observed pixels are darkened to isolate water bodies.

This removes the dependency on deploying a new server-side layer while keeping
the rendering algorithm explicit and versioned in the repository.

The full L2A analytical script for index 0 remains in
`mago-water-quality-index-0.js`. A future L2A layer or Processing/Statistical
API adapter is still required for SCL cloud statistics and traceable scalar
point values.

The application intentionally does not reinterpret WMS-rendered RGB channels
as a concentration. Point values remain unavailable until a server-side
Processing or Statistical API adapter returns the scalar together with its
unit, method, method version, algorithm reference, and `dataMask`.

## Scientific and licensing boundary

This is a surface optical estimate, not a complete water-quality grade. Results
are sensitive to atmospheric correction, mixed water constituents, clouds,
sun glint, adjacency effects, and the regional calibration domain.

The evalscript is adapted from the MAGO Water Quality Monitoring Tool developed
within the PRIMA MAGO Project by CETAQUA and is distributed under CC BY-SA 4.0.
The active indices cite:

- Mishra, S., and Mishra, D. R. (2012). Normalized difference chlorophyll index:
  A novel model for remote estimation of chlorophyll-a concentration in turbid
  productive waters. Remote Sensing of Environment, 117, 394-406.
- Zhan et al. (2022). Sentinel-2 turbidity model validated with atmospherically
  corrected water-surface reflectance. https://doi.org/10.23818/limn.41.18
- Sòria-Perpinyà et al. (2021). Validation of Water Quality Monitoring
  Algorithms for Sentinel-2 and Sentinel-3 in Mediterranean Inland Waters with
  In Situ Reflectance Data. https://doi.org/10.3390/w13050686
- MAGO source and documentation:
  https://custom-scripts.sentinel-hub.com/sentinel-2/mago_water_quality_monitoring_tool/
- Sentinel Hub Water Bodies Mapping classifier:
  https://custom-scripts.sentinel-hub.com/sentinel-2/water_bodies_mapping-wbm/
- Feyisa et al. (2014), Automated Water Extraction Index:
  https://doi.org/10.1016/j.rse.2013.08.029
