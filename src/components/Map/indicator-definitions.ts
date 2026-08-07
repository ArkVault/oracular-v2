import {
  Container,
  Droplets,
  Eye,
  Flame,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';

interface IndicatorBase {
  name: string;
  icon: LucideIcon;
  description: string;
  quote: string;
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

export const INDICATORS: IndicatorDefinition[] = [
  {
    name: 'Natural Color',
    type: 'natural',
    icon: Eye,
    description: 'Natural satellite imagery showing Earth as it appears to the human eye. This view helps identify surface features, vegetation patterns, and water bodies in their true colors using cloud-free imagery for optimal visibility.',
    quote: 'Reference: European Space Agency. (2015). Sentinel-2 User Handbook (Issue 1, Revision 2).',
  },
  {
    name: 'Chlorophyll-a',
    icon: Droplets,
    layer: 'CHLA',
    description: 'Chlorophyll-a is the primary photosynthetic pigment found in all plants and algae. High concentrations in water bodies indicate algal blooms, which can affect water quality and ecosystem health. Regular monitoring helps identify potential eutrophication issues and assess the overall health of aquatic ecosystems.',
    quote: 'Reference: Gitelson, A. A., et al. (2008). "A simple semi-analytical model for remote estimation of chlorophyll-a in turbid waters: Validation." Remote Sensing of Environment, 112(9), 3582-3593. https://doi.org/10.1016/j.rse.2008.04.015',
  },
  {
    name: 'Dissolved Oxygen',
    icon: Wind,
    layer: 'DISSOLVED-OXYGEN',
    description: 'Dissolved oxygen (DO) is essential for aquatic life and ecosystem health. Low DO levels can stress or kill fish and other organisms. Levels are affected by temperature, atmospheric pressure, biological activity, and water movement. Healthy water bodies typically maintain DO levels between 6-10 mg/L.',
    quote: 'Reference: Diaz, R. J., & Rosenberg, R. (2008). "Spreading dead zones and consequences for marine ecosystems." Science, 321(5891), 926-929. https://doi.org/10.1126/science.1156401',
  },
  {
    name: 'Total Suspended Solids',
    icon: Container,
    layer: 'TOTAL-SUSPENDED-SOLIDS',
    description: 'Total Suspended Solids (TSS) measures particles suspended in water, including sediment, algae, and organic matter. High TSS levels can reduce water clarity, affect aquatic life, and indicate pollution or erosion. It\'s a key indicator of water quality and can impact ecosystem functioning and recreational water use.',
    quote: 'Reference: Ritchie, J. C., Zimba, P. V., & Everitt, J. H. (2003). "Remote sensing techniques to assess water quality." Photogrammetric Engineering & Remote Sensing, 69(6), 695-704. https://doi.org/10.14358/PERS.69.6.695',
  },
  {
    name: 'Turbidity',
    icon: Waves,
    layer: 'TURBIDITY',
    description: 'Turbidity measures water clarity and how much light can penetrate through water. It\'s affected by suspended particles like clay, silt, organic matter, and microorganisms. High turbidity can harm aquatic life by reducing light penetration, increasing water temperature, and decreasing dissolved oxygen levels. It\'s also an important indicator for drinking water quality.',
    quote: 'Reference: Kirk, J. T. O. (1994). Light and Photosynthesis in Aquatic Ecosystems (2nd ed.). Cambridge University Press. https://doi.org/10.1017/CBO9780511623370',
  },
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
];
