---
name: oracular-water-quality-evalscripts
description: Improve, review, or debug Oracular Sentinel-2 water-quality evalscripts and their map UI. Use for MAGO NDCI, CDOM, Turbidity, or TSS formulas; water/cloud/urban masking; calibrated palettes and measurement scales; acquisition metadata and citations; false-positive or incomplete-water-body diagnosis; efficient latest-request-only WMS tile loading; and real Copernicus WMS validation.
---

# Oracular Water Quality Evalscripts

Treat the scientific estimate, the water mask, and the visualization as separate contracts. Optimize them independently and never describe a rendered color as a calibrated measurement unless its mapping is documented.

## Required workflow

1. Inspect `docs/mago-water-quality-index.md`, the selected evalscript, its indicator definition, and its integration tests.
2. Work on one parameter at a time. Record bands, preprocessing level, formula, coefficients, units, calibration domain, water type, masks, palette, citation, and limitations before editing.
3. Verify every formula and threshold against primary literature or the cited official implementation. Do not invent coefficients or widen a scientific validity domain to improve appearance.
4. Write a failing behavioral test first. Cover a valid water pixel, cloud, land or urban false positive, `dataMask=0`, formula-domain boundary, and the reported regression.
5. Implement the smallest traceable change. Keep no-data transparent and darken observed pixels rejected by the water/cloud mask.
6. Run the targeted Vitest file, then `npm run check`.
7. Validate the actual Copernicus WMS layer in the map at the reported location and acquisition date. Inspect the encoded evalscript sent in tile URLs; a passing synthetic test is insufficient.
8. Update the right-panel description and implementation note whenever behavior, calibration, saturation, or limitations change.

## Scientific and rendering rules

- Preserve the published scalar formula and calibration domain. Maintain separate concepts for raw estimate, display value, valid-data mask, and interpretation metadata.
- Saturate a finite out-of-domain value at a palette endpoint only for continuous visualization. State that the endpoint means “at or beyond the calibrated limit”; do not imply extrapolated quantitative accuracy.
- Return transparent RGBA only for true `dataMask=0`. Use the shared dark semitransparent shade for observed land, cloud, urban, bare-soil, or invalid pixels.
- Keep the palette, legend stops, point interpretation, units, and panel copy synchronized.
- Display the actual acquisition timestamp in every parameter view and retain a scientific citation plus an Oracular implementation note.

## Water-mask lessons

- Apply masking before the parameter formula: `dataMask`, cloud rejection, spectral water identification, false-positive rejection, then parameter calculation.
- Use Sentinel Hub WBM equations exactly. In particular, calculate AWEInsh with SWIR1 (`B11`) in both SWIR1 terms; do not silently substitute `B12`.
- Treat WBM's shadow/snow/ice filter as optional. Its documentation recommends disabling it for ordinary single-scene analysis because it can remove real water.
- Expect a precision/recall tradeoff. Requiring several water indices reduces orange urban blobs but can fragment turbid rivers and shorelines. Relaxing to a single permissive response can color large urban areas.
- Diagnose each rejection stage separately. Do not assume a missing river segment is outside the measurement scale; it may have failed CLM, the water classifier, an urban/soil filter, division validity, or data availability.
- Do not claim guaranteed continuous rivers, lakes, lagoons, or coastlines from the current Level-1C pixel classifier. The configured WMS collection is `S2L1C`; live requests for `SCL` fail because the collection has no SCL band.
- Require Sentinel-2 Level-2A with `SCL=6`, or an independent hydrographic boundary dataset, when exact continuous water-body coverage is a product requirement. Do not emulate topology by loosening spectral thresholds until land is colored.

## Turbidity-specific decisions

- Use `194.79 * (B05 * (B05 / B02)) + 0.9061` and label values as NTU.
- Keep the published `0.10–15.89 NTU` calibration domain and the orange→yellow→violet→purple palette.
- Clamp finite display values to that domain instead of reclassifying confirmed water as land. If confirmed water has `B02=0`, render the upper endpoint and disclose that the ratio is undefined rather than reporting a precise value.
- Preserve cloud and urban/soil rejection even when a more permissive mask visually increases coverage. Prefer migration to L2A or hydrographic geometry over scientifically indefensible thresholds.

## Efficient WMS loading policy

Treat each indicator/date/time selection as one logical mosaic even though Leaflet must request several viewport tiles. Apply a strict **latest request wins** policy:

- Cancel any pending selection delay, debounce, fetch, or analysis request when a newer selection supersedes it. Use `AbortController` where the API supports cancellation.
- Immediately unmount the active analysis `WMSTileLayer` when its indicator, date, time, or evalscript changes. Never retain an old `selectedLayer` while pairing it with the new indicator render configuration.
- Identify a request with an immutable key containing the source layer, rendered layer, acquisition date, tile time, and evalscript revision or hash when applicable. Allow only the matching latest key to commit ready state.
- Set analysis overlays to `keepBuffer={0}` unless measured navigation performance proves that buffering is necessary. Keep ordinary basemap buffering independent.
- Hide a new analysis layer with `opacity={0}` while its tile grid emits `loading`; reveal it only after the matching Leaflet `load` event confirms that the current grid is complete. This prevents partially painted mosaics.
- Removing a Leaflet layer may not stop every already-started HTTP transfer, but it must detach its tiles and make stale callbacks unable to update visible state.
- Do not interpret “only the latest tile” as requesting one 256×256 tile for the whole map. Preserve all tiles required to cover the viewport; eliminate obsolete mosaics and offscreen analysis buffers.

Add a regression test that starts one indicator load, supersedes it with another before completion, and proves that the earlier layer never mounts. Also test that the latest layer stays hidden until its own `load` event and that rapid changes cannot combine a previous source layer with a new evalscript.

## Validation evidence

Before handoff, report:

- the exact targeted and full-suite commands and results;
- whether real WMS tiles loaded the revised evalscript;
- the acquisition date used for visual validation;
- visible improvements and remaining false positives or omissions;
- whether claims are local, Preview, or production evidence;
- any provider limitation that blocks the requested guarantee.

Never call a layer scientifically validated solely because lint, unit tests, or a build pass. Require real imagery and, for quantitative accuracy, local in-situ validation.
