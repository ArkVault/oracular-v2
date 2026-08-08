# Scientific point-analysis diagnostic

Status: blocked for scientific concentration output, transport-safe fallback implemented.

Date verified: 2026-08-07.

Update on 2026-08-08: the application-level `Dissolved Oxygen` indicator has
been replaced by a versioned `Water Quality` integration for MAGO indices 0
(chlorophyll-a by NDCI), 5 (turbidity), 6 (CDOM), and 7 (high-range TSS). Their buttons,
scientifically bounded visualization scales, attributions, evalscripts, and
tests are present. They are supplied as per-request WMS evalscripts and have not
been deployed as dedicated layers to the public Sentinel Hub WMS instance.
See `docs/mago-water-quality-index.md` for the exact deployment boundary.

## Repository and pull request boundary

- Repository: `ArkVault/oracular-v2`.
- Pull request #9 targets `development` from `codex/map-design-patterns`.
- At verification time the pull request was open, draft, mergeable, two commits ahead, and not merged.
- The implementation in this branch is therefore not assumed to exist in `development`.

## Live provider evidence

The configured endpoint is a Copernicus Data Space Sentinel Hub WMS instance. Its live `GetCapabilities` response identifies the service as `Sentinel Hub WMS service - Orber` and lists `CHLA`, `DISSOLVED-OXYGEN`, `TOTAL-SUSPENDED-SOLIDS`, and `TURBIDITY` as queryable layers. It does not expose the evalscripts, input bands, formulae, coefficients, units, palette stops, interpolation method, or validation domains.

At point `20.2, -103.05`, date `2026-08-04`, `MAXCC=10`, all four live `GetFeatureInfo` calls selected the same scene:

- Scene: `S2C_MSIL1C_20260804T171901_N0512_R012_T13QFC_20260804T205553.SAFE`
- Acquisition: `2026-08-04`
- Cloud cover: `7.78%`
- Product level: Sentinel-2 L1C, established by the scene identifier and returned product path

| Layer | Returned output | Defensible interpretation |
| --- | --- | --- |
| `CHLA` | `out1=0.80635`, `out2=0.760724`, `out3=0.607419` | Three evalscript output channels; not a documented concentration |
| `DISSOLVED-OXYGEN` | `out1=0.1953`, `out2=0.1975`, `out3=0.1992` | Three evalscript output channels; not a documented concentration |
| `TOTAL-SUSPENDED-SOLIDS` | `out1=0.528004`, `out2=0.056008`, `out3=0.471996` | Three evalscript output channels; not a documented concentration |
| `TURBIDITY` | `out1=0`, `out2=0`, `out3=0` | Black output; without `dataMask` or alpha this is not proof of no-data |

The same CHLA layer also returned non-zero three-channel output at another water point and zero channels at other points while still returning a valid scene footprint. This confirms why RGB values, including black, cannot be used as an out-of-area test.

The instance Configuration API endpoints for the instance and its layers returned `401 Unauthorized`. No Copernicus OAuth client is configured in this repository. Consequently, the exact evalscripts cannot be inspected from the available evidence.

## Scientific status by parameter

| Parameter | Bands | Atmospheric correction | L1C/L2A | Formula and coefficients | Unit | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| Chlorophyll-a | Unknown | Unknown | Live scene is L1C (TOA) | Unknown | Intended UI unit `mg/m³`, not present in provider response | Concentration unavailable |
| Dissolved Oxygen | Unknown | Unknown | Live scene is L1C (TOA) | Unknown | Intended UI unit `mg/L`, not present in provider response | Concentration unavailable |
| Total Suspended Solids | Unknown | Unknown | Live scene is L1C (TOA) | Unknown | Intended UI unit `mg/L`, not present in provider response | Concentration unavailable |
| Turbidity | Unknown | Unknown | Live scene is L1C (TOA) | Unknown | Intended UI unit `NTU`, not present in provider response | Concentration unavailable |

These fields are intentionally recorded as unknown. Selecting NDCI, MCI, OC3, a dissolved-oxygen regression, a TSS regression, or a turbidity algorithm without the configured layer definition and its validation context would be an unsupported scientific substitution.

Sentinel-2 L1C supplies top-of-atmosphere reflectance. L2A supplies bottom-of-atmosphere reflectance after atmospheric correction. That distinction is documented by Copernicus, but it does not reveal which bands or corrections the private layer evalscripts apply.

## Root cause in the application

The previous implementation treated frontend legend values and sampled display colors as if they were the provider evalscript calibration. It then projected `out1/out2/out3` onto those colors and emitted `mg/m³`, `mg/L`, or `NTU`. The mapping was not traceable to the provider. The PR also allowed brightness gain adjustment, which made the inverse less exact rather than more defensible.

The previous no-data heuristic classified sufficiently dark RGB output as outside the area. A real `GetFeatureInfo` response can contain a valid scene plus `[0,0,0]`, so this heuristic conflated unknown rendered color with provider no-data.

## Implemented safe contract

The point result now carries parameter, value, unit, method, method version, value source, estimate flag, confidence/uncertainty/color-distance fields, scene metadata, algorithm reference, message, and out-of-area state.

The adapter applies this priority:

1. Accept `provider-scalar` only when the provider returns an explicit finite `value`, the exact configured unit, a non-negative value, and a method identifier.
2. Never interpret one anonymous `outN` field as a scalar.
3. Return `unavailable` for uncalibrated RGB, including black.
4. Set `isOutOfArea` only when the provider returns no feature or an explicit `dataMask=0`.
5. Use a fixed point-sized EPSG:4326 query so screen zoom and device pixel ratio do not change the analytical request.

No provider-RGB inversion, Delta E threshold, or water-quality classification is implemented. The separately versioned MAGO visualization evalscripts documented in `docs/mago-water-quality-index.md` do not change this point-analysis boundary: scalar values remain unavailable until a Processing or Statistical API integration returns their analytical outputs.

## Recommended next phase

Preferred option: version each layer evalscript in this repository and make its default output a scalar `FLOAT32` plus `dataMask`, with a separately identified visualization output where needed. Each script must declare its collection, bands, input units, formula, coefficients, valid domain, output unit, algorithm version, and primary reference. A server-side endpoint can then call the Processing or Statistical API using OAuth credentials that are never exposed through `VITE_*` variables.

Alternative options:

1. Modify the existing WMS configuration so `GetFeatureInfo` exposes explicit `value`, `unit`, `method`, and `methodVersion` fields.
2. Use the Sentinel Hub Statistical API with a versioned evalscript and `dataMask` for area statistics.
3. Supply the exact versioned value-to-color table and interpolation rule from the current evalscript; only then implement perceptual-distance inversion and a tested rejection threshold.
4. Expose a documented spectral index as `spectral-proxy`, clearly stating that it is not a concentration.

## Primary and authorized references

- [Copernicus Data Space: Sentinel Hub WMS](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/OGC/WMS.html)
- [Copernicus Data Space: Evalscript](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Evalscript.html)
- [Copernicus Data Space: Evalscript functions and output values](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Evalscript/Functions.html)
- [Copernicus Data Space: Statistical API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html)
- [Copernicus Sentinel-2 Collection 1 Level-1C product](https://sentinels.copernicus.eu/sentinel-data-access/sentinel-products/sentinel-2-data-products/collection-1-level-1c)
- [ESA Sentinel-2 User Handbook](https://sentinels.copernicus.eu/documents/247904/685211/S2_User_Handbook.pdf/8869acdf-fd84-43ec-ae8c-3e80a436a16c?t=1438278087000)
