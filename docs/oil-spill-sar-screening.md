# Sentinel-1 marine oil-like dark-return screening

Status: application integration complete and validated against a real public WMS
tile through the existing `INFRAR` Sentinel-1 GRD layer.

## Product boundary

The left-panel `Oil Spill Detection` control is an alert-screening view. It does
not confirm petroleum. The Copernicus reference describes a YOLOv4 detector
trained with 5,930 Sentinel-1 images and manually reviewed detections; its model
weights and inference service are not part of this application. The browser-side
evalscript therefore implements a transparent dark-return baseline and labels
its red output as a potential oil-like candidate.

## Data and processing

- Sensor and product: Sentinel-1 GRD, C-band SAR
- WMS carrier layer: `INFRAR` in the Orber/Oracular Sentinel Hub instance
- Acquisition mode expected from the layer: IW
- Polarization: dual VV+VH
- Input unit: calibrated linear power, converted in the evalscript with
  `10 * log10(linearPower)`
- No-data: transparent
- Non-target/high-backscatter surface: near-black mask at `0.86` opacity
- SAR water background: dark natural blue at `0.38` opacity so the basemap
  remains visible
- Potential oil-like dark return: red
- Script: `sentinel-hub/evalscripts/oil-spill-sar-screening.js`

The first stage retains pixels meeting both global permanent-water thresholds
reported by Bauer-Marschallinger et al. (2021): `VV <= -15 dB` and
`VH <= -22.9 dB`. Requiring both polarizations prioritizes land-rejection
precision. The second stage marks retained pixels with `VV <= -25 dB` as
potential oil-like dark returns. The `-25 dB` value follows the Sentinel-1 VV
threshold reported by Habibie et al. (2025); it is a fixed screening threshold,
not a universal physical boundary or a reproduction of the Yang et al. model.

## Acquisition metadata

Selecting this indicator switches acquisition discovery from the Sentinel-2 WFS
type to Sentinel-1 `DSS3`. Optical `MAXCC` filtering is omitted because SAR is
not blocked by clouds. The right-panel badge therefore reports the timestamp of
the selected Sentinel-1 acquisition rather than a Sentinel-2 scene.

## Limitations and confirmation

Low wind, wave fronts, natural or biogenic films, rain cells, radar shadows,
coastal geometry, and processing artefacts can all resemble an oil slick. Fixed
pixel thresholds also lack the spatial context, object shape, temporal context,
wind fields, and look-alike classifier used by operational or trained systems.
Any alert must be reviewed with surrounding SAR texture and, where available,
wind, AIS, temporal imagery, optical imagery, or field observations.

## References

- Yang et al. (2022), *A deep learning based oil spill detector using Sentinel-1
  SAR imagery*: https://doi.org/10.1080/01431161.2022.2109445
- Copernicus Sentinel success story:
  https://sentinels.copernicus.eu/web/success-stories/-/copernicus-sentinel-1-data-enable-oil-spill-detection-in-south-eastern-mediterranean-sea
- ICEYE operational examples:
  https://www.iceye.com/blog/timely-sar-data-speeds-up-marine-oil-spill-response-two-example-cases
- Habibie et al. (2025), fixed Sentinel-1 VV threshold:
  https://doi.org/10.1007/s10661-025-14222-z
- Bauer-Marschallinger et al. (2021), global VV/VH permanent-water thresholds:
  https://doi.org/10.1038/s41597-021-01059-7
- Copernicus Data Space Sentinel-1 GRD API documentation:
  https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S1GRD.html

## Real WMS evidence

On 2026-08-08, a 256 × 256 WMS request across the Veracruz coast using the
versioned evalscript returned a valid RGBA PNG from `INFRAR`. Water rendered as
the configured blue background and high-backscatter land remained dark. No red
candidate was visible in that verification tile; this confirms rendering and
mask separation, not detector sensitivity or the absence of oil.
