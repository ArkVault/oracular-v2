# Sentinel-1 coastal Sargassum SAR screening

## Scope

`Sargassum Detection` is a Sentinel-1 GRD screening visualization for bright,
positive-contrast floating-macroalgae candidates in coastal and open marine
water. It is not a species classifier and does not confirm Sargassum.

## Inputs

- Collection: Sentinel-1 GRD
- Polarizations: VV and VH
- Units: calibrated linear power
- Render source: configured `INFRAR` Sentinel-1 WMS layer
- Script: `sentinel-hub/evalscripts/sargassum-sar-screening.js`

## Two-stage screening

1. VV and VH are converted to decibels. VV must remain at or below a
   conservative water anchor (`VV <= -17 dB`), 2 dB darker than the published
   `-15 dB` permanent-water boundary. This tighter guard rejects more
   terrestrial shadows and structures. Rejected pixels are darkened.
2. Smooth water remains a low-opacity dark blue background. A candidate must
   show moderate positive VH contrast (`-22.9 dB < VH <= -20 dB`) while VV
   continues to satisfy the water anchor. Candidate intensity uses the
   published SARgassum combination:

```text
SG = 0.1 * sigma0_VV + 3 * sigma0_VH
```

The display bounds for SG are derived from the conservative VV anchor and the
VH contrast window, not from a claimed universal concentration threshold. The
extra 2 dB VV margin and `-20 dB` VH ceiling prioritize visual precision; they
are not published species thresholds and may omit weak or strong real rafts.

## Rivers, coastlines, and false positives

Typical smooth rivers remain in the dark-water background because they do not
show positive contrast in both polarizations. Strong river structures can still
resemble marine targets: Sentinel-1 backscatter alone has no geographic concept
of river versus sea.

The research workflow applies a land mask extended two pixels offshore and a
neighborhood-based Constant False Alarm Rate detector. A per-pixel WMS
evalscript cannot reproduce either operation. Guaranteed coast-only detection
therefore requires an external shoreline/ocean polygon and a Processing API or
server-side CFAR stage. Ships, platforms, breaking waves, convergence fronts,
and other floating matter can also create positive SAR contrast.

Qi et al. found only occasional Sentinel-1 detection of Atlantic
*S. fluitans/natans* and concluded SAR should complement, not replace, optical
monitoring for distribution or temporal quantification.

## References

- Biermann, L., et al. (2024). *Automated Detection of Sargassum Invasions in
  the Caribbean Using Sentinel-1 SAR*. IGARSS 2024.
  https://doi.org/10.1109/IGARSS53475.2024.10641475
- Qi, L., Wang, M., Hu, C., & Holt, B. (2022). *On the capacity of Sentinel-1
  synthetic aperture radar in detecting floating macroalgae and other floating
  matters*. Remote Sensing of Environment, 280, 113188.
  https://doi.org/10.1016/j.rse.2022.113188
- Bauer-Marschallinger, B., et al. (2021). *The normalised Sentinel-1 Global
  Backscatter Model*. Scientific Data, 8, 277.
  https://doi.org/10.1038/s41597-021-01059-7
