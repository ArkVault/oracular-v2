import {
  Droplet,
  FlaskConical,
  Flame,
  Gauge,
  Leaf,
  Satellite,
  Sprout,
  type LucideIcon,
} from 'lucide-react';

import magoWaterQualityEvalscript from '../../../sentinel-hub/evalscripts/mago-water-quality-index-0-wms.js?raw';
import magoTurbidityEvalscript from '../../../sentinel-hub/evalscripts/mago-water-quality-index-5-wms.js?raw';
import magoCdomEvalscript from '../../../sentinel-hub/evalscripts/mago-water-quality-index-6-wms.js?raw';
import magoTssEvalscript from '../../../sentinel-hub/evalscripts/mago-water-quality-index-7-wms.js?raw';
import oilSpillSarEvalscript from '../../../sentinel-hub/evalscripts/oil-spill-sar-screening.js?raw';
import sargassumSarEvalscript from '../../../sentinel-hub/evalscripts/sargassum-sar-screening.js?raw';
import type { AcquisitionCollection } from '@/features/acquisitions/ports/acquisition-date-provider';
import type { Language } from '@/i18n/i18n';

interface IndicatorBase {
  acquisitionCollection?: AcquisitionCollection;
  name: string;
  icon: LucideIcon;
  description: string;
  quote: string;
  implementationNote?: string;
  citation?: {
    label: string;
    href: string;
  };
  additionalCitations?: Array<{
    label: string;
    href: string;
  }>;
  render?: {
    layer: string;
    evalscript: string;
  };
}

export interface NaturalIndicator extends IndicatorBase {
  type: 'natural';
}

export interface DiscreteIndicator extends IndicatorBase {
  type: 'discrete';
  layer: string;
  indicators: Array<{ color: string; label: string }>;
}

export interface ContinuousIndicator extends IndicatorBase {
  type?: undefined;
  layer: string;
}

export type IndicatorDefinition =
  | NaturalIndicator
  | DiscreteIndicator
  | ContinuousIndicator;

const SPANISH_INDICATORS: Record<string, Partial<IndicatorDefinition>> = {
  'Natural Color': {
    name: 'Color Natural',
    description: 'Imagen satelital en colores naturales, similar a como la superficie terrestre se ve al ojo humano. Ayuda a reconocer vegetación, agua y rasgos del terreno.',
    quote: 'Referencia: Agencia Espacial Europea. (2015). Sentinel-2 User Handbook (Issue 1, Revision 2).',
  },
  'Chlorophyll-a': {
    name: 'Clorofila-a',
    description: 'La capa CHLA configurada se conserva como una vista cualitativa de patrones posiblemente relacionados con clorofila-a. No debe interpretarse como concentración hasta contar con el evalscript, bandas, preprocesamiento, coeficientes, paleta, dominio de calibración y validación local del proveedor.',
    implementationNote: 'Frente al referente Ulyssys, Oracular no afirma equivalencia MCI ni concentración calibrada porque el evalscript remoto no está expuesto. Las mejoras son trazabilidad y seguridad de entrega: sin escalas inventadas ni inversión RGB, con fecha de adquisición, carga exclusiva de la última solicitud y revelado atómico del mosaico.',
    quote: 'Revisión de cumplimiento científico: Ulyssys es un referente MCI cualitativo para Sentinel-2. El método CHLA del proveedor no está publicado; su equivalencia algorítmica y sus valores cuantitativos no están verificados.',
  },
  'Water Quality': {
    name: 'Calidad del agua',
    description: 'El índice 0 de MAGO estima clorofila-a superficial con reflectancia roja y borde rojo de Sentinel-2 mediante NDCI. Primero rechaza nubes, tierra, zonas urbanas y suelo desnudo; después aplica la fórmula sólo a píxeles de agua aceptados en el dominio visual de 0–30 mg/m³.',
    implementationNote: 'Se conservan la fórmula del índice 0 y su paleta. El flujo original Level-2A se adaptó a la capa WMS Level-1C disponible mediante un filtro en dos etapas: CLM y máscara espectral de agua, seguidos por NDCI y validación de dominio.',
  },
  Turbidity: {
    name: 'Turbidez',
    description: 'El índice 5 de MAGO estima turbidez superficial con B05 y B02. La escala naranja–amarillo–violeta–morado cubre el dominio publicado de 0.10–15.89 NTU y se aplica a agua clara identificada en ríos, lagos, lagunas y costa; nubes, ciudad y suelo se oscurecen.',
    implementationNote: 'Oracular conserva la paleta anterior y usa el dominio validado de Zhan et al. La máscara combina señales de agua, filtros urbano/suelo y nube. Los valores de agua fuera del dominio se saturan al extremo más cercano. Esta adaptación Level-1C es de exploración y requiere validación local in situ.',
  },
  CDOM: {
    description: 'El índice 6 de MAGO estima materia orgánica disuelta coloreada mediante la razón B04/B02. Una máscara CLM/WBM oscurece nubes y superficies no acuáticas antes de aplicar el dominio publicado de 0.03–5.30 µg/L QSE.',
    implementationNote: 'Oracular aplica la máscara compartida antes de la fórmula de Sòria-Perpinyà et al. y rechaza estimaciones fuera del dominio. Esta adaptación Level-1C es una visualización de exploración y necesita corrección atmosférica acuática y validación local.',
  },
  'Total Suspended Solids': {
    name: 'Sólidos Suspendidos Totales',
    description: 'El índice 7 de MAGO estima sólidos suspendidos totales mediante B07/B02. La máscara compartida oscurece nubes y superficies no acuáticas; después se restringe a razón > 0.8 y al dominio publicado de 20.00–78.82 mg/L.',
    implementationNote: 'Oracular conserva la visualización azul–cian–verde–amarillo–rojo, aplicada sólo después de la máscara de agua y las comprobaciones de validez. Esta adaptación Level-1C requiere corrección atmosférica acuática y validación local.',
  },
  'Forest Fire Detection': {
    name: 'Detección de Incendios Forestales',
    description: 'Monitoreo satelital de incendios forestales. El rojo indica fuegos activos y el amarillo zonas quemadas recientemente; sirve como apoyo para respuesta de emergencia y manejo forestal.',
    indicators: [{ color: 'bg-red-600', label: 'Incendios activos' }, { color: 'bg-yellow-500', label: 'Áreas quemadas' }],
  },
  'Oil Spill Detection': {
    name: 'Detección de Derrames de Petróleo',
    description: 'Exploración Sentinel-1 GRD VV/VH de retornos oscuros compatibles con hidrocarburos en mar abierto y costa. El rojo marca candidatos para revisión, no petróleo confirmado.',
    implementationNote: 'Oracular convierte VV/VH calibrados a decibeles, aplica límites publicados de agua permanente y después evalúa retornos oscuros. El umbral es una línea base de exploración: viento bajo, películas biogénicas, lluvia, sombras y artefactos pueden parecerse a un derrame. Toda alerta exige confirmación contextual.',
    quote: 'Retornos SAR oscuros potencialmente compatibles con petróleo. Se requiere confirmación operativa antes de reportar un derrame.',
    indicators: [{ color: 'bg-red-500', label: 'Retorno oscuro potencialmente compatible con petróleo' }, { color: 'bg-sky-800', label: 'Fondo acuático SAR' }],
  },
  'Sargassum Detection': {
    name: 'Detección de Sargazo',
    description: 'Exploración Sentinel-1 GRD VV/VH de macroalgas flotantes con contraste radar positivo en agua marina y costera. Los candidatos aparecen de dorado a fucsia sobre fondo oscuro.',
    implementationNote: 'Oracular usa VV/VH calibrados y márgenes conservadores para reducir falsos positivos terrestres. Sentinel-1 por sí solo no distingue topológicamente río y mar; garantizar operación sólo costera requiere un polígono oceánico externo y procesamiento de servidor. Barcos, plataformas, oleaje y frentes pueden producir falsos positivos.',
    quote: 'Retornos potenciales de macroalgas flotantes. Todo candidato requiere confirmación independiente.',
    indicators: [{ color: 'bg-fuchsia-400', label: 'Posible balsa de sargazo con contraste positivo' }, { color: 'bg-cyan-950', label: 'Fondo marino SAR' }],
  },
};

export function localizeIndicator(indicator: IndicatorDefinition, language: Language): IndicatorDefinition {
  if (language === 'en') return indicator;
  return { ...indicator, ...SPANISH_INDICATORS[indicator.name] } as IndicatorDefinition;
}

export interface WaterQualityIndexOption {
  index: number;
  label: string;
  unit: string;
  indicator?: ContinuousIndicator;
}

export const WATER_QUALITY_INDICATOR: ContinuousIndicator = {
  name: 'Water Quality',
  icon: FlaskConical,
  layer: 'WATER-QUALITY',
  render: {
    layer: 'CHLA',
    evalscript: magoWaterQualityEvalscript,
  },
  description: 'MAGO index 0 estimates surface chlorophyll-a from Sentinel-2 red and red-edge reflectance using the NDCI algorithm adapted from Mishra et al. First, CLM and the Water Bodies Mapping classifier reject clouds, land, urban surfaces, and bare soil. Second, the formula is applied only to accepted water pixels within the 0–30 mg/m³ display domain; all rejected observed pixels are darkened.',
  implementationNote: 'The index 0 formula and 0–30 mg/m³ palette are preserved. The original Level-2A SCL workflow was adapted to the available Level-1C WMS layer with a two-stage filter: CLM plus the MAGO spectral water-body mask, followed by the NDCI formula and domain validation.',
  quote: 'MAGO Water Quality Monitoring Tool, developed within the PRIMA MAGO Project by CETAQUA. Index 0: Chlorophyll-a (NDCI), based on Mishra & Mishra (2012). CC BY-SA 4.0.',
  citation: {
    label: 'Mishra & Mishra (2012) — Normalized Difference Chlorophyll Index',
    href: 'https://doi.org/10.1016/j.rse.2011.10.016',
  },
};

export const WATER_QUALITY_TURBIDITY_INDICATOR: ContinuousIndicator = {
  name: 'Turbidity',
  icon: Gauge,
  layer: 'WATER-QUALITY-TURBIDITY',
  render: {
    layer: 'CHLA',
    evalscript: magoTurbidityEvalscript,
  },
  description: 'MAGO index 5 estimates surface turbidity from Sentinel-2 B05 and B02 reflectance. The restored orange→yellow→violet→purple ramp spans the published 0.10–15.89 NTU calibration domain and is applied to clear water pixels identified across rivers, lakes, lagoons, and coastal water. Clouds, urban surfaces, and bare soil are darkened.',
  implementationNote: 'Oracular restores the previous Turbidity palette while replacing its former 0–50 display range with the Zhan et al. 0.10–15.89 NTU validation domain. The water mask combines a two-signal WBM core with a turbid-water/shoreline path using the natural zero boundaries of MNDWI plus NDWI or NDVI; its documented urban/bare-soil filter, corrected AWEInsh SWIR1 equation, and the Copernicus cloud mask remain active. Water estimates outside the calibrated domain—and confirmed water with zero blue reflectance, where the ratio is undefined—are saturated at the nearest palette endpoint instead of being mistaken for non-water. The optional WBM shadow/snow filter stays disabled because WBM warns that it can remove real water bodies. Values at a palette endpoint can therefore mean “at or beyond the calibrated limit.” The current WMS collection is Level-1C and has no SCL water class, so exact continuous hydrographic coverage requires migrating the layer to Level-2A or adding an independent water-boundary dataset. This remains screening imagery until locally validated against in-situ measurements.',
  quote: 'MAGO index 5: Turbidity (NTU), using the Sentinel-2 model by Zhan et al. (2022). The published validation domain is 0.10–15.89 NTU.',
  citation: {
    label: 'Zhan et al. (2022) — Sentinel-2 turbidity model',
    href: 'https://doi.org/10.23818/limn.41.18',
  },
};

export const WATER_QUALITY_CDOM_INDICATOR: ContinuousIndicator = {
  name: 'CDOM',
  icon: Gauge,
  layer: 'WATER-QUALITY-CDOM',
  render: {
    layer: 'CHLA',
    evalscript: magoCdomEvalscript,
  },
  description: 'MAGO index 6 estimates surface colored dissolved organic matter from the Sentinel-2 B04/B02 reflectance ratio. A first-stage CLM/WBM mask darkens clouds and non-water surfaces. The formula and its published 0.03–5.30 µg/L QSE domain are then applied only to accepted water pixels.',
  implementationNote: 'Oracular applies a shared two-stage mask before the Sòria-Perpinyà et al. CDOM formula and rejects out-of-domain estimates. The study used water-leaving reflectance; this Level-1C WMS adaptation remains a screening visualization and needs water-specific atmospheric correction plus local in-situ validation for quantitative use.',
  quote: 'MAGO index 6: CDOM (µg/L QSE), Sentinel-2 model by Sòria-Perpinyà et al. (2021).',
  citation: {
    label: 'Sòria-Perpinyà et al. (2021) — Sentinel-2 CDOM model',
    href: 'https://doi.org/10.3390/w13050686',
  },
};

export const WATER_QUALITY_TSS_INDICATOR: ContinuousIndicator = {
  name: 'Total Suspended Solids',
  icon: Gauge,
  layer: 'WATER-QUALITY-TSS',
  render: {
    layer: 'CHLA',
    evalscript: magoTssEvalscript,
  },
  description: 'MAGO index 7 estimates surface total suspended solids from the Sentinel-2 B07/B02 reflectance ratio. First, the shared CLM/WBM mask darkens clouds and non-water surfaces. Second, the formula is restricted to ratio > 0.8 and the published 20.00–78.82 mg/L domain; other observed pixels remain darkened.',
  implementationNote: 'Oracular keeps the blue→cyan→green→yellow→red visualization but applies it only after the common water mask and the Sòria-Perpinyà et al. high-TSS validity checks. The original model used water-leaving reflectance; this Level-1C WMS adaptation requires water-specific atmospheric correction plus local in-situ validation for quantitative use.',
  quote: 'MAGO index 7: Total Suspended Solids (mg/L), high-concentration Sentinel-2 model by Sòria-Perpinyà et al. (2021).',
  citation: {
    label: 'Sòria-Perpinyà et al. (2021) — Sentinel-2 TSS model',
    href: 'https://doi.org/10.3390/w13050686',
  },
};

export const WATER_QUALITY_INDEX_OPTIONS: WaterQualityIndexOption[] = [
  { index: 6, label: 'CDOM', unit: 'µg/L QSE', indicator: WATER_QUALITY_CDOM_INDICATOR },
  { index: 5, label: 'Turbidity', unit: 'NTU', indicator: WATER_QUALITY_TURBIDITY_INDICATOR },
  { index: 7, label: 'Total Suspended Solids', unit: 'mg/L', indicator: WATER_QUALITY_TSS_INDICATOR },
];

export const INDICATORS: IndicatorDefinition[] = [
  {
    name: 'Natural Color',
    type: 'natural',
    icon: Satellite,
    description: 'Natural satellite imagery showing Earth as it appears to the human eye. This view helps identify surface features, vegetation patterns, and water bodies in their true colors using cloud-free imagery for optimal visibility.',
    quote: 'Reference: European Space Agency. (2015). Sentinel-2 User Handbook (Issue 1, Revision 2).',
  },
  {
    name: 'Chlorophyll-a',
    icon: Sprout,
    layer: 'CHLA',
    description: 'The configured CHLA layer is retained as a qualitative screening view of spatial patterns potentially related to chlorophyll-a. It must not be interpreted as a concentration map until the provider supplies its evalscript, input bands, preprocessing level, coefficients, palette mapping, calibration domain, and local validation evidence.',
    implementationNote: 'Compared with the published Ulyssys benchmark, Oracular does not claim MCI equivalence or calibrated chlorophyll-a concentration because the remote CHLA evalscript is not exposed. Oracular improvements are therefore traceability and delivery safeguards: no fabricated numeric scale, no inversion of rendered RGB into point concentrations, an acquisition timestamp, latest-request-only WMS loading, and atomic reveal of the completed tile mosaic. These improve scientific honesty and map reliability, not the undisclosed spectral algorithm.',
    quote: 'Scientific compliance review — Ulyssys is a qualitative MCI benchmark for Sentinel-2, using B05 relative to a B04–B06 baseline and a default −0.005 to 0.05 display interval. The configured provider CHLA method is undisclosed, so algorithmic equivalence and quantitative values remain unverified.',
    citation: {
      label: 'Zlinszky & Padányi-Gulyás (2020) — Ulyssys Water Quality Viewer',
      href: 'https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ulyssys_water_quality_viewer/',
    },
    additionalCitations: [{
      label: 'Ulyssys technical description supplementary',
      href: 'https://doi.org/10.20944/preprints202001.0386.v1',
    }],
  },
  WATER_QUALITY_INDICATOR,
  {
    name: 'Forest Fire Detection',
    icon: Flame,
    type: 'discrete',
    indicators: [
      { color: 'bg-red-600', label: 'Active Fires' },
      { color: 'bg-yellow-500', label: 'Burned Areas' },
    ],
    layer: 'INCENDIOS-FORESTALES',
    description: 'Satellite-based monitoring of forest fires. Red indicators show currently active fires, while yellow areas represent recently burned zones. This information is crucial for emergency response and forest management.',
    quote: 'Reference: Giglio, L., Schroeder, W., & Justice, C. O. (2016). "The Collection 6 MODIS active fire detection algorithm and fire products." Remote Sensing of Environment, 178, 31-41. https://doi.org/10.1016/j.rse.2016.02.054',
  },
  {
    name: 'Oil Spill Detection',
    icon: Droplet,
    type: 'discrete',
    layer: 'OIL-SPILL-SAR',
    acquisitionCollection: 'sentinel-1',
    render: {
      layer: 'INFRAR',
      evalscript: oilSpillSarEvalscript,
    },
    indicators: [
      { color: 'bg-red-500', label: 'Potential oil-like dark return' },
      { color: 'bg-sky-800', label: 'SAR water background' },
    ],
    description: 'Sentinel-1 GRD VV/VH screening for potential marine oil-like dark returns in open water and coastal zones. The first stage rejects high-backscatter non-water pixels; the second highlights very low VV returns. Red areas are candidates for review, not confirmed petroleum.',
    implementationNote: 'Oracular converts calibrated Sentinel-1 VV and VH linear power to decibels, then applies the published dual-polarization permanent-water limits of VV ≤ −15 dB and VH ≤ −22.9 dB with logical AND before evaluating oil-like returns. This stricter first stage reduces land and urban false positives. Rejected surfaces use the shared dark mask; accepted water uses a darker, low-opacity blue so the natural basemap remains visible; candidates at or below −25 dB VV remain red. This fixed threshold is a screening baseline, not the YOLOv4 detector described by Yang et al. Oil-spill look-alikes—including low wind areas, wave fronts, biogenic films, rain cells, radar shadows, and processing artefacts—can produce similar dark returns. Every alert requires contextual review and preferably temporal, wind, AIS, or field confirmation.',
    quote: 'Potential oil-like SAR dark returns. Operational confirmation is required before reporting an oil spill.',
    citation: {
      label: 'Yang et al. (2022) — Sentinel-1 SAR oil-spill detector',
      href: 'https://doi.org/10.1080/01431161.2022.2109445',
    },
    additionalCitations: [
      {
        label: 'Copernicus Sentinel-1 oil-spill success story',
        href: 'https://sentinels.copernicus.eu/web/success-stories/-/copernicus-sentinel-1-data-enable-oil-spill-detection-in-south-eastern-mediterranean-sea',
      },
      {
        label: 'ICEYE — Timely SAR oil-spill response cases',
        href: 'https://www.iceye.com/blog/timely-sar-data-speeds-up-marine-oil-spill-response-two-example-cases',
      },
      {
        label: 'Habibie et al. (2025) — VV dark-return threshold',
        href: 'https://doi.org/10.1007/s10661-025-14222-z',
      },
      {
        label: 'Bauer-Marschallinger et al. (2021) — Global VV/VH water thresholds',
        href: 'https://doi.org/10.1038/s41597-021-01059-7',
      },
    ],
  },
  {
    name: 'Sargassum Detection',
    icon: Leaf,
    type: 'discrete',
    layer: 'SARGASSUM-SAR',
    acquisitionCollection: 'sentinel-1',
    render: {
      layer: 'INFRAR',
      evalscript: sargassumSarEvalscript,
    },
    indicators: [
      { color: 'bg-fuchsia-400', label: 'Potential positive-contrast Sargassum raft' },
      { color: 'bg-cyan-950', label: 'Marine SAR background' },
    ],
    description: 'Sentinel-1 GRD VV/VH screening for floating macroalgae with positive radar contrast in coastal and open marine water. Smooth water remains dark blue, land-like bright returns are darkened, and candidates are shown from gold to fuchsia using the VH-weighted SARgassum index.',
    implementationNote: 'Oracular now uses Sentinel-1 calibrated VV and VH linear power. To suppress terrestrial false positives, VV uses a conservative −17 dB water anchor—2 dB darker than the published permanent-water boundary—and VH candidates are limited to a moderate −22.9 to −20 dB positive-contrast window. Smooth water and typical river returns remain unhighlighted background; accepted pixels use the published VH-weighted SARgassum index. These extra margins prioritize precision and are visualization guards, not published species thresholds. Sentinel-1 alone cannot encode river-versus-sea topology, and this per-pixel WMS path cannot run the paper’s neighborhood CFAR detector or its two-pixel-extended shoreline mask. Guaranteed coast-only operation still requires an external ocean polygon plus server-side processing. Ships, platforms, breaking waves, fronts, and other floating matter remain possible false positives.',
    quote: 'Potential positive-contrast floating-macroalgae returns. Sentinel-1 detects Atlantic Sargassum only occasionally; every candidate requires independent confirmation.',
    citation: {
      label: 'Biermann et al. (2024) — Sentinel-1 SARgassum index',
      href: 'https://doi.org/10.1109/IGARSS53475.2024.10641475',
    },
    additionalCitations: [
      {
        label: 'Qi et al. (2022) — Sentinel-1 floating macroalgae capability',
        href: 'https://doi.org/10.1016/j.rse.2022.113188',
      },
      {
        label: 'Bauer-Marschallinger et al. (2021) — Global VV/VH water thresholds',
        href: 'https://doi.org/10.1038/s41597-021-01059-7',
      },
    ],
  },
];
