import * as React from 'react';

/* eslint-disable react-refresh/only-export-components -- provider and hook form one API */

export type Language = 'en' | 'es';
const STORAGE_KEY = 'oracular.language';

const messages = {
  en: {
    'nav.primary': 'Primary navigation', 'nav.dates': 'Dates', 'nav.sensors': 'Sensors', 'nav.guide': 'Guide', 'nav.guideOn': 'Turn on workflow guide', 'nav.guideOff': 'Turn off workflow guide', 'nav.search': 'Search', 'nav.notifications': 'Notifications',
    'language.label': 'Language', 'language.english': 'English', 'language.spanish': 'Español',
    'calendar.eyebrow': 'Copernicus imagery', 'calendar.title': 'Select acquisition date', 'calendar.available': 'Colored dates have available imagery', 'calendar.loading': 'Loading available Copernicus dates…', 'calendar.empty': 'No cloud-safe acquisitions in the last 12 months.', 'calendar.count': '{count} cloud-safe acquisitions', 'calendar.loadingShort': 'Loading calendar…',
    'sensors.eyebrow': 'Data sources', 'sensors.title': 'Available sensors', 'sensors.active': 'Active · multispectral', 'sensors.soon': 'Coming soon',
    'search.placeholder': 'Search places...', 'search.clear': 'Clear search', 'search.loading': 'Searching...', 'search.empty': 'No results found',
    'indicator.title': 'Indicators', 'indicator.available': 'Available', 'indicator.pending': 'Pending calibration', 'indicator.hide': 'Hide indicators', 'indicator.show': 'Show indicators',
    'detail.close': 'Close details', 'detail.imageAcquisition': 'Image acquisition', 'detail.acquired': 'Acquired', 'detail.noTimestamp': 'Timestamp unavailable', 'detail.classes': 'Color classes', 'detail.noRange': 'Calibrated measurement range unavailable', 'detail.noPalette': 'The configured provider palette and scientific value mapping are not available.', 'detail.efficiency': 'Request efficiency and API safeguards', 'detail.improved': 'Oracular improved index implementation', 'detail.references': 'Scientific references', 'detail.citation': 'Scientific citation',
    'guide.label': 'Workflow guide', 'guide.previous': 'Previous step', 'guide.dismiss': 'Dismiss workflow guide', 'guide.step1': 'Step 1 of 4', 'guide.searchTitle': 'Search for a place', 'guide.searchDescription': 'Find and select the coast, lake, city, or landscape you want to analyze.', 'guide.openSearch': 'Open Search', 'guide.step2': 'Step 2 of 4', 'guide.dateTitle': 'Choose an acquisition date', 'guide.dateDescription': 'Open Dates and select a highlighted day with available satellite imagery.', 'guide.openDates': 'Open Dates', 'guide.step3': 'Step 3 of 4', 'guide.indicatorTitle': 'Choose an indicator', 'guide.indicatorDescription': 'Select any analysis from the left panel. Indicator access is unrestricted while the application remains in testing.', 'guide.step4': 'Step 4 of 4', 'guide.readyTitle': 'Ready to go', 'guide.readyDescription': 'Your indicator is applied. Explore the map or click any water body to inspect the result.', 'guide.ready': 'Ready to go', 'guide.search': 'Search', 'guide.dates': 'Dates', 'guide.indicators': 'Indicators', 'guide.readyShort': 'Ready',
    'loader.analysis': 'Analyzing satellite data',
    'map.controls': 'Map controls', 'map.polygon': 'Draw polygon', 'map.rectangle': 'Draw rectangle', 'map.zoomIn': 'Zoom in', 'map.zoomOut': 'Zoom out', 'map.clear': 'Clear drawings', 'map.reset': 'Reset view',
    'point.region': 'Selected point details', 'point.selected': 'Selected point', 'point.title': 'Point information', 'point.close': 'Close point details', 'point.coordinates': 'Coordinates', 'point.value': 'Value', 'point.estimated': 'Estimated value', 'point.outside': 'Out of the area of interest', 'point.quality': 'Quality', 'point.noData': 'No data available', 'point.source': 'Source', 'point.method': 'Method', 'point.confidence': 'Confidence', 'point.color': 'Color difference', 'point.acquisition': 'Acquisition', 'point.cloud': 'Cloud cover', 'point.scene': 'Scene', 'point.algorithm': 'Algorithm reference',
  },
  es: {
    'nav.primary': 'Navegación principal', 'nav.dates': 'Fechas', 'nav.sensors': 'Sensores', 'nav.guide': 'Guía', 'nav.guideOn': 'Activar guía de flujo', 'nav.guideOff': 'Desactivar guía de flujo', 'nav.search': 'Buscar', 'nav.notifications': 'Notificaciones',
    'language.label': 'Idioma', 'language.english': 'English', 'language.spanish': 'Español',
    'calendar.eyebrow': 'Imágenes Copernicus', 'calendar.title': 'Selecciona la fecha de adquisición', 'calendar.available': 'Las fechas coloreadas tienen imágenes disponibles', 'calendar.loading': 'Cargando fechas disponibles de Copernicus…', 'calendar.empty': 'No hay adquisiciones con nubosidad aceptable en los últimos 12 meses.', 'calendar.count': '{count} adquisiciones con nubosidad aceptable', 'calendar.loadingShort': 'Cargando calendario…',
    'sensors.eyebrow': 'Fuentes de datos', 'sensors.title': 'Sensores disponibles', 'sensors.active': 'Activo · multiespectral', 'sensors.soon': 'Próximamente',
    'search.placeholder': 'Buscar lugares...', 'search.clear': 'Limpiar búsqueda', 'search.loading': 'Buscando...', 'search.empty': 'No se encontraron resultados',
    'indicator.title': 'Indicadores', 'indicator.available': 'Disponible', 'indicator.pending': 'Calibración pendiente', 'indicator.hide': 'Ocultar indicadores', 'indicator.show': 'Mostrar indicadores',
    'detail.close': 'Cerrar detalles', 'detail.imageAcquisition': 'Adquisición de imagen', 'detail.acquired': 'Adquirida', 'detail.noTimestamp': 'Fecha y hora no disponibles', 'detail.classes': 'Clases de color', 'detail.noRange': 'Rango de medición calibrado no disponible', 'detail.noPalette': 'La paleta del proveedor y su correspondencia científica con valores no están disponibles.', 'detail.efficiency': 'Eficiencia de solicitudes y protecciones de API', 'detail.improved': 'Implementación del índice mejorada por Oracular', 'detail.references': 'Referencias científicas', 'detail.citation': 'Cita científica',
    'guide.label': 'Guía de flujo', 'guide.previous': 'Paso anterior', 'guide.dismiss': 'Cerrar guía de flujo', 'guide.step1': 'Paso 1 de 4', 'guide.searchTitle': 'Busca un lugar', 'guide.searchDescription': 'Encuentra y selecciona la costa, lago, ciudad o paisaje que quieres analizar.', 'guide.openSearch': 'Abrir búsqueda', 'guide.step2': 'Paso 2 de 4', 'guide.dateTitle': 'Elige una fecha de adquisición', 'guide.dateDescription': 'Abre Fechas y selecciona un día resaltado con imágenes satelitales disponibles.', 'guide.openDates': 'Abrir fechas', 'guide.step3': 'Paso 3 de 4', 'guide.indicatorTitle': 'Elige un indicador', 'guide.indicatorDescription': 'Selecciona cualquier análisis del panel izquierdo. El acceso a indicadores no tiene restricciones mientras la aplicación permanece en pruebas.', 'guide.step4': 'Paso 4 de 4', 'guide.readyTitle': 'Todo listo', 'guide.readyDescription': 'Tu indicador está aplicado. Explora el mapa o haz clic en un cuerpo de agua para inspeccionar el resultado.', 'guide.ready': 'Todo listo', 'guide.search': 'Buscar', 'guide.dates': 'Fechas', 'guide.indicators': 'Indicadores', 'guide.readyShort': 'Listo',
    'loader.analysis': 'Analizando datos satelitales',
    'map.controls': 'Controles del mapa', 'map.polygon': 'Dibujar polígono', 'map.rectangle': 'Dibujar rectángulo', 'map.zoomIn': 'Acercar', 'map.zoomOut': 'Alejar', 'map.clear': 'Borrar dibujos', 'map.reset': 'Restablecer vista',
    'point.region': 'Detalles del punto seleccionado', 'point.selected': 'Punto seleccionado', 'point.title': 'Información del punto', 'point.close': 'Cerrar detalles del punto', 'point.coordinates': 'Coordenadas', 'point.value': 'Valor', 'point.estimated': 'Valor estimado', 'point.outside': 'Fuera del área de interés', 'point.quality': 'Calidad', 'point.noData': 'No hay datos disponibles', 'point.source': 'Fuente', 'point.method': 'Método', 'point.confidence': 'Confianza', 'point.color': 'Diferencia de color', 'point.acquisition': 'Adquisición', 'point.cloud': 'Cobertura nubosa', 'point.scene': 'Escena', 'point.algorithm': 'Referencia del algoritmo',
  },
} as const;

export type TranslationKey = keyof typeof messages.en;
interface I18nValue { language: Language; locale: string; setLanguage: (language: Language) => void; t: (key: TranslationKey, values?: Record<string, string | number>) => string }
function translate(language: Language, key: TranslationKey, values: Record<string, string | number> = {}) {
  let value: string = messages[language][key];
  for (const [name, replacement] of Object.entries(values)) value = value.split(`{${name}}`).join(String(replacement));
  return value;
}
const I18nContext = React.createContext<I18nValue>({
  language: 'en', locale: 'en-US', setLanguage: () => undefined,
  t: (key, values) => translate('en', key, values),
});

function initialLanguage(): Language {
  try { const stored = localStorage.getItem(STORAGE_KEY); if (stored === 'en' || stored === 'es') return stored; } catch { /* noop */ }
  return globalThis.navigator?.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function I18nProvider({ children }: React.PropsWithChildren) {
  const [language, setState] = React.useState<Language>(initialLanguage);
  const setLanguage = React.useCallback((next: Language) => { setState(next); try { localStorage.setItem(STORAGE_KEY, next); } catch { /* noop */ } }, []);
  React.useEffect(() => { document.documentElement.lang = language; }, [language]);
  const t = React.useCallback((key: TranslationKey, values: Record<string, string | number> = {}) => translate(language, key, values), [language]);
  return <I18nContext.Provider value={{ language, locale: language === 'es' ? 'es-MX' : 'en-US', setLanguage, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return React.useContext(I18nContext);
}
