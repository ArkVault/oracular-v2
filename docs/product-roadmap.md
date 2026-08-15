# Oracular V2 — Roadmap de estabilización y evolución

**Versión:** 1.1
**Fecha:** 2026-08-15
**Estado:** Draft para validación
**Horizonte propuesto:** 8–12 semanas para estabilización, más ciclos de calibración por parámetro

## 1. Resumen ejecutivo

Oracular V2 es una SPA geoespacial para explorar imágenes de Copernicus y analizar indicadores ambientales sobre un mapa. Antes de ampliar el producto, el proyecto debe asegurar la integridad de los datos, reducir deuda técnica, incorporar pruebas, corregir la experiencia responsive y establecer una entrega reproducible en Vercel.

Después de esa estabilización, el roadmap incorpora autenticación con Google y un calendario que únicamente permita seleccionar fechas con imágenes Copernicus cuya nubosidad reportada sea inferior al 10%.

Una fase posterior convertirá, parámetro por parámetro, los resultados
cualitativos en estimaciones cuantitativas regionales. El usuario proporcionará
los evalscripts; para cada modelo se deberán reunir datos regionales de
calibración y contrastar el algoritmo con literatura científica primaria y
observaciones in situ antes de mostrar una concentración aproximada al hacer
clic sobre un área o píxel.

## 2. Problema actual

- Los valores mostrados al consultar un punto son simulados y pueden confundirse con mediciones reales.
- El componente principal concentra presentación, reglas, llamadas externas y estado del mapa.
- No existe cobertura automatizada ni gates completos de calidad.
- La interfaz no es usable en viewports estrechos.
- El repositorio y las dependencias no ofrecen aún una base limpia y reproducible.
- El selector de fechas no consulta disponibilidad real de imágenes ni filtra nubosidad.
- No existe identidad de usuario ni protección de sesiones.

## 3. Objetivos y métricas

| Objetivo | Métrica | Meta |
|---|---|---:|
| Recuperar confianza en los análisis | Valores simulados presentados como reales | 0 |
| Proteger la estabilidad | Build, lint y tests en CI | 100% verdes |
| Mejorar mantenibilidad | Tamaño del componente principal | Menos de 250 líneas |
| Habilitar uso responsive | Flujos P0 utilizables entre 375 y 1440 px | 100% |
| Controlar acceso | Login Google y rutas protegidas | 100% de vistas privadas |
| Asegurar calidad de imagen | Fechas habilitadas con nubosidad >= 10% | 0 |
| Entregar de forma reproducible | Preview de Vercel por cambio aprobado | 100% |
| Habilitar resultados cuantitativos | Parámetros que muestran concentración sin calibración regional validada | 0 |

## 4. Usuarios principales

### Analista ambiental

- Necesita localizar un área, identificar fechas útiles y aplicar análisis sobre imágenes con poca nubosidad.
- Requiere distinguir claramente datos reales, falta de datos y errores de proveedor.

### Operador o investigador

- Necesita volver a la aplicación con una identidad persistente y trabajar desde escritorio o tablet.
- Requiere una experiencia predecible para seleccionar área, indicador y fecha.

## 5. Principios del roadmap

1. No agregar indicadores mientras el dato puntual siga siendo simulado.
2. Ninguna fase avanza si build, lint y tests no están verdes.
3. Vercel aloja la aplicación; la identidad será gestionada por un proveedor OAuth compatible.
4. Una fecha solo será seleccionable si existe una adquisición elegible para el área actual.
5. El umbral inicial de nubosidad será `< 10%`, configurable y aplicado en servidor o proveedor, no solo ocultado en UI.
6. Los secretos nunca se expondrán como variables `VITE_*`.
7. Ningún índice espectral o color RGB se presentará como concentración sin una
   calibración regional validada con datos in situ.
8. Los evalscripts se revisarán y mejorarán de uno en uno; un parámetro debe
   quedar documentado, probado y validado antes de avanzar al siguiente.

## 5.1 Historias de usuario prioritarias

### P0 — Must have

- Como analista, quiero que cada valor consultado provenga de una fuente real y trazable para poder confiar en el análisis.
- Como usuario, quiero iniciar sesión con Google para acceder al mapa sin crear otra contraseña.
- Como analista, quiero ver habilitadas únicamente las fechas con imágenes de nubosidad inferior al 10% para evitar análisis inválidos.
- Como analista, quiero que la escena elegida en el calendario sea la misma que utiliza el mapa y el análisis.

### P1 — Should have

- Como usuario, quiero entender si una fecha no tiene cobertura, excede la nubosidad o falló la consulta.
- Como usuario móvil o de tablet, quiero operar los flujos principales sin paneles superpuestos.
- Como operador, quiero detectar una regresión antes de que llegue a producción.
- Como analista, quiero hacer clic sobre un píxel calibrado y ver una
  concentración aproximada, su unidad, procedencia, incertidumbre y versión del
  modelo para interpretar el resultado responsablemente.

### P2 — Futuro

- Como analista, quiero guardar áreas, fechas y configuraciones en mi cuenta.
- Como administrador, quiero controlar qué usuarios pueden acceder.
- Como analista avanzado, quiero filtrar nubosidad específicamente sobre mi AOI.

## 5.2 Requisitos no funcionales

| Categoría | Requisito inicial |
|---|---|
| Seguridad | OAuth con PKCE/flujo gestionado, redirects allowlisted y secretos fuera del cliente |
| Rendimiento | Respuesta inicial de disponibilidad en menos de 3 s bajo condiciones normales |
| Resiliencia | Timeout, cancelación y errores explícitos para todos los proveedores externos |
| Accesibilidad | Navegación por teclado, foco visible y controles con nombre accesible |
| Compatibilidad | Viewports de 375 a 1440 px y navegadores evergreen |
| Observabilidad | Registrar proveedor, operación, duración y error sin guardar tokens ni datos sensibles |
| Trazabilidad | Cada análisis conserva adquisición, colección, fecha, capa y criterio de nubosidad |

## 6. Roadmap por fases

### Fase 0 — Baseline y decisiones (2–3 días)

**Objetivo:** establecer una línea base reproducible antes de cambiar comportamiento.

- Documentar instalación, desarrollo, build y despliegue.
- Fijar Node 22 o 24 LTS mediante `.nvmrc` o `engines`.
- Definir qué artefactos se versionan y retirar `node_modules` del seguimiento.
- Resolver o retirar la integración incompleta de Task Master.
- Auditar dependencias de producción y desarrollo.
- Confirmar proveedor de autenticación. Recomendación inicial: Supabase Auth con Google OAuth.
- Verificar qué colección Copernicus alimentará el calendario y cómo expone fecha, cobertura y nubosidad.

**Criterio de salida:** una instalación limpia reproduce el build y las decisiones abiertas tienen responsable.

### Fase 1 — Integridad de datos geoespaciales (1–2 semanas)

**Objetivo:** reemplazar las mediciones simuladas por resultados verificables.

- Implementar `GetFeatureInfo` real o el mecanismo equivalente del proveedor.
- Validar capacidades, formatos, CRS, unidades, fecha y ausencia de datos.
- Presentar estados explícitos: cargando, dato real, sin cobertura y error.
- Registrar la fuente, timestamp y capa usados para cada resultado.
- Eliminar `Math.random()` del flujo productivo.
- Añadir timeouts, cancelación y manejo de errores externos.

**Criterios de aceptación:**

- Dos consultas sobre el mismo punto, capa y fecha producen el mismo resultado.
- Un error del proveedor nunca se muestra como valor válido.
- Cada medición visible identifica capa, fecha, unidad y fuente.

**Checkpoint 2026-08-01:** `GetFeatureInfo` real está integrado y la simulación fue eliminada. La instancia devuelve escena, fecha, nubosidad y canales renderizados; Oracular V2 los trata explícitamente como no escalares. Sigue pendiente configurar una salida científica escalar o adoptar Statistical API para completar la fase.

### Fase 2 — Arquitectura y contratos tipados (1 semana)

**Objetivo:** preparar el código para incorporar funcionalidades sin ampliar el componente monolítico.

- Separar navegación, mapa, indicadores, detalles, búsqueda y resultado puntual.
- Extraer `CopernicusClient` y `GeocodingClient` detrás de interfaces.
- Crear hooks para disponibilidad, capa WMS, búsqueda y consulta puntual.
- Modelar `Indicator`, `Acquisition`, `CloudCoverage`, `FeatureInfo` y estados de carga.
- Convertir las reglas de calidad en configuración o estrategias tipadas.

**Criterio de salida:** los componentes visuales no realizan llamadas HTTP directas.

### Fase 3 — Testing y gates de calidad (1 semana)

**Objetivo:** detectar regresiones antes del despliegue.

- Tests unitarios para rangos y clasificación de calidad.
- Tests de integración con respuestas mock de Copernicus y geocodificación.
- E2E del flujo: abrir mapa, seleccionar indicador, elegir fecha disponible y consultar punto.
- Añadir scripts `test` y `test:e2e`.
- Ejecutar build, lint y tests en CI.

**Criterio de salida:** el flujo principal tiene cobertura automatizada y todos los gates pasan.

**Checkpoint 2026-08-01:** baseline local en progreso. Existen 13 tests unitarios, 2 de integración, 1 smoke test, cobertura del dominio crítico y un gate `check` verde. El loader actual de `oracular-v2` quedó integrado y probado. CI y E2E permanecen pendientes; ver `docs/test-checkpoint.md`.

### Fase 4 — Responsive, accesibilidad y UX de mapa (1 semana)

**Objetivo:** hacer usable el producto en móvil, tablet y escritorio.

- Convertir los paneles laterales en drawers adaptables.
- Evitar superposición y overflow horizontal.
- Crear navegación compacta para móvil.
- Añadir nombres accesibles, foco visible y operación por teclado.
- Diseñar estados vacíos y de error consistentes.

**Criterio de salida:** los flujos P0 funcionan en 375, 768 y 1440 px sin contenido inaccesible.

**Checkpoint 2026-08-01:** se integró el lenguaje visual modular de `oracular-v2`: header de cristal, paneles flotantes, navegación compacta, popovers de fechas/sensores, estados activos y adaptación móvil. La composición fue validada manualmente en 375 y 1440 px sin overflow horizontal; quedan pendientes E2E responsive y auditoría completa de accesibilidad.

### Fase 5 — Pipeline de Vercel (2–3 días)

**Objetivo:** obtener un entorno Preview estable antes de configurar OAuth.

- Vincular el repositorio con un proyecto de Vercel.
- Configurar framework Vite, comando de build y directorio `dist`.
- Separar variables Development, Preview y Production.
- Verificar despliegue Preview y rollback.
- Configurar dominio definitivo antes de registrar callbacks OAuth de producción.

**Criterio de salida:** Preview público verificado y producción preparada, sin afirmar producción lista hasta completar auth.

### Fase 6 — Login con Google (1 semana)

**Objetivo:** restringir la aplicación a usuarios autenticados mediante Google OAuth.

**Alcance v1:**

- Botón `Continuar con Google`.
- Callback OAuth para localhost, Vercel Preview y dominio de producción.
- Persistencia y restauración segura de sesión.
- Rutas o shell de aplicación protegidos.
- Cierre de sesión y estado de usuario en navegación.
- Página de error para OAuth cancelado, callback inválido o cuenta no autorizada.

**Criterios de aceptación:**

- Un usuario no autenticado no accede al mapa protegido.
- Login, recarga y logout funcionan en localhost y Vercel.
- Los secretos permanecen en el proveedor o entorno servidor.
- Los redirects solo aceptan orígenes autorizados.

**Fuera de alcance inicial:** roles, equipos, facturación, invitaciones y cuentas con contraseña.

### Fase 7 — Calendario Copernicus con nubosidad menor al 10% (2–3 semanas)

**Objetivo:** convertir `Dates` en un selector de adquisiciones realmente utilizables.

#### Flujo de usuario

1. El usuario define o visualiza un área de interés.
2. Abre `Dates`.
3. El sistema consulta adquisiciones Copernicus compatibles con el área e indicador.
4. El calendario habilita únicamente días con al menos una imagen cuya nubosidad reportada sea `< 10%`.
5. Al seleccionar un día, si hay varias adquisiciones elegibles, el sistema aplica una regla determinista o permite elegir la escena.
6. El mapa carga la imagen seleccionada y los análisis usan exactamente esa adquisición.

#### Reglas de negocio

- El umbral es estrictamente menor a 10; `10.0%` no es elegible.
- La nubosidad debe venir de metadatos del catálogo, no inferirse del WMS renderizado.
- La consulta se limita por geometría o bounding box del área actual.
- Las fechas se normalizan en UTC y se deduplican.
- Un cambio de área, colección o indicador invalida la disponibilidad anterior.
- Una fecha sin adquisición elegible aparece deshabilitada.
- La selección guarda `acquisitionId`, fecha, colección y cloud cover; no solo una fecha textual.
- Si el dato de nubosidad está ausente, la adquisición no será elegible por defecto.

#### Trabajo técnico

- Añadir un adaptador de catálogo Copernicus separado del adaptador de visualización.
- Investigar y validar la colección, metadato de nubosidad y vínculo entre adquisición y capa renderizable.
- Crear caché corta por área, colección y rango temporal.
- Cancelar consultas anteriores cuando cambien los filtros.
- Añadir estados cargando, sin imágenes elegibles y error del catálogo.
- Pasar la adquisición seleccionada al servicio de análisis y a la capa de mapa.

#### Criterios de aceptación

- Ninguna fecha con nubosidad `>= 10%` puede seleccionarse.
- Todas las fechas habilitadas corresponden a una adquisición real y trazable.
- Seleccionar una fecha actualiza mapa y análisis con el mismo `acquisitionId`.
- Un área sin imágenes elegibles muestra una explicación y permite ampliar el rango.
- El resultado se prueba con casos de 9.99%, 10%, metadato ausente y múltiples escenas por día.

### Fase 8 — Calibración cuantitativa regional por parámetro (duración dependiente de datos)

**Objetivo:** evolucionar las visualizaciones cualitativas para que, cuando
exista evidencia suficiente, un clic sobre un área o píxel muestre una
concentración aproximada científicamente trazable, con unidad, método,
incertidumbre y dominio regional de validez.

Esta fase no busca producir números visualmente plausibles. Una salida sólo se
considerará cuantitativa cuando pueda trazarse a un escalar del proveedor, un
algoritmo documentado calibrado regionalmente o una relación exacta
`valor científico → color` respaldada por el evalscript y datos de validación.

#### Secuencia de calibración

El usuario compartirá el evalscript de cada parámetro. Se trabajará un parámetro
a la vez, comenzando por:

1. Chlorophyll-a, resolviendo explícitamente si el producto operativo será MCI,
   NDCI u otro modelo regional de concentración.
2. Turbidity.
3. Total Suspended Solids.
4. CDOM.
5. Otros parámetros cuantitativos que se incorporen posteriormente.

Las capas de detección —incendios, derrames de petróleo y sargazo— requieren
modelos de clasificación y validación propios; no deben expresarse como una
concentración mediante este flujo.

#### Ciclo obligatorio por parámetro

1. Versionar y conservar el evalscript original proporcionado por el usuario.
2. Identificar bandas, colección, nivel de procesamiento, máscaras, fórmula,
   coeficientes, unidad, dominio y paleta que realmente utiliza.
3. Determinar si la salida actual es concentración, índice, proxy espectral,
   canales RGB renderizados o no-data.
4. Revisar literatura científica primaria aplicable al sensor, tipo de agua y
   región; no transferir automáticamente un algoritmo desarrollado para otro
   cuerpo de agua.
5. Reunir observaciones in situ emparejadas espacial y temporalmente con las
   adquisiciones Sentinel, incluyendo método de laboratorio, unidad, control de
   calidad, límite de detección e incertidumbre.
6. Calibrar el modelo y validarlo con datos independientes. Definir antes del
   ajuste las métricas y umbrales de aceptación por parámetro, incluyendo como
   mínimo MAE, RMSE, sesgo, tamaño de muestra y dominio de concentración.
7. Versionar fórmula, coeficientes, dataset, región, periodo, preprocesamiento,
   métricas, incertidumbre y limitaciones del modelo aceptado.
8. Preferir una salida escalar `FLOAT32` mediante evalscript, Statistical API o
   GetFeatureInfo. La inversión de color será únicamente un fallback cuando la
   paleta exacta y su interpolación sean verificables.
9. Integrar el resultado en el panel derecho y validar el comportamiento real
   antes de comenzar el siguiente parámetro.

#### Contrato del resultado puntual

El resultado de un clic deberá distinguir al menos:

- `provider-scalar`: valor escalar entregado por el proveedor.
- `scientific-algorithm`: concentración calculada con un modelo calibrado.
- `calibrated-color`: estimación invertida desde una paleta exacta.
- `spectral-proxy`: índice cualitativo que no representa concentración.
- `unavailable`: calibración o dato insuficiente.

Cuando el resultado sea cuantitativo, el panel mostrará:

- Parámetro, concentración aproximada y unidad correcta.
- Fuente, algoritmo y versión de calibración.
- Adquisición, fecha, colección y nubosidad.
- Región y dominio de validez.
- Confianza o intervalo de incertidumbre.
- Advertencia de que se trata de una estimación satelital, no una medición in
  situ.

Si el modelo no es válido para la región, fecha, tipo de agua o rango observado,
la UI mantendrá el resultado cualitativo y explicará por qué no hay una
concentración disponible.

#### Reglas técnicas y científicas

- La leyenda, unidad, stops de color y estimador consumirán una sola definición
  tipada y versionada.
- No se estimará concentración desde el píxel compuesto con el basemap; se usará
  la salida analítica original, sin contaminación por opacidad, antialiasing o
  compresión.
- La inversión de color reproducirá el método del evalscript y aplicará un
  umbral perceptual documentado; un color fuera de tolerancia no se forzará al
  valor más cercano.
- El mismo punto, adquisición y parámetro producirá un valor equivalente al
  cambiar el zoom dentro de una tolerancia definida.
- “Out of the area of interest” se reservará para transparencia, no-data o fuera
  del footprint; un color no calibrado dentro de la imagen no se clasificará
  como fuera del área.
- Las credenciales de Configuration API o Statistical API permanecerán en una
  función server-side y nunca en variables `VITE_*`.

#### Criterios de aceptación por parámetro

- El evalscript original y el mejorado están versionados y comparados.
- Fórmula, coeficientes, bandas, unidad y referencias científicas son
  verificables.
- Existe un dataset regional in situ con trazabilidad y una validación
  independiente del ajuste.
- Las métricas cumplen los umbrales acordados antes de mostrar concentración.
- Ningún RGB, índice o proxy se etiqueta como mg/m³, mg/L, NTU u otra magnitud.
- Un clic calibrado muestra concentración aproximada, unidad, procedencia,
  versión e incertidumbre.
- No-data, color no calibrado y punto fuera del área son estados distintos.
- El resultado es estable frente al zoom y utiliza la misma adquisición que la
  imagen visible.
- Pruebas unitarias, integración, cobertura, build y validación real en navegador
  están aprobadas.
- El aviso cualitativo sólo se retira o sustituye para el parámetro y dominio
  regional que hayan superado estos criterios.

**Criterio de salida de la fase:** todos los parámetros priorizados tienen una
ficha de decisión. Cada uno está marcado explícitamente como cuantitativo
validado, proxy cualitativo o bloqueado por falta de datos; no quedan estados
ambiguos.

## 7. Dependencias entre fases

```text
Baseline
  └─ Integridad de datos
       └─ Arquitectura tipada
            └─ Testing
                 └─ Responsive
                      └─ Vercel Preview
                           └─ Google OAuth
                                └─ Calendario Copernicus <10%
                                     └─ Calibración cuantitativa regional
```

La investigación de catálogo Copernicus puede ejecutarse en paralelo desde la
Fase 2. La revisión bibliográfica y de evalscripts puede comenzar antes de la
Fase 8, pero ninguna concentración se habilitará hasta disponer de datos
regionales y validación independiente.

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El WMS actual no expone adquisiciones ni tiempo suficiente | Calendario bloqueado | Usar catálogo para descubrir escenas y un adaptador separado para renderizar |
| Nubosidad global baja pero nubes sobre el área de interés | Análisis pobre | Comenzar con metadato de escena y evaluar máscara de nubes por AOI como v2 |
| Callbacks OAuth variables en Preview | Login inconsistente | Usar callback estable del proveedor y allowlist controlada |
| APIs externas lentas o limitadas | UX degradada | Caché, cancelación, rate limits y mensajes explícitos |
| Dependencias actuales vulnerables | Riesgo de release | Auditoría por alcance y upgrades incrementales antes de producción |
| Falta de muestras in situ regionales | Impide validar concentraciones | Mantener el parámetro como proxy cualitativo y definir una campaña de muestreo |
| Modelo publicado no transferible a la región | Valores sesgados aunque la fórmula sea correcta | Calibrar por tipo de agua, validar fuera de muestra y documentar el dominio |
| Inversión de colores contaminada por renderizado | Concentración falsa | Preferir salida escalar y usar sólo la imagen analítica con paleta exacta |

## 9. Fuera de alcance de este roadmap

- Roles administrativos y permisos granulares.
- Guardado de proyectos o áreas por usuario.
- Máscaras de nubes calculadas píxel a píxel sobre el AOI.
- Procesamiento asíncrono pesado o exportaciones analíticas.
- Nuevos indicadores ambientales antes de validar los actuales.
- Presentar clasificaciones de incendios, petróleo o sargazo como
  concentraciones cuantitativas.

## 10. Preguntas abiertas

1. ¿Supabase Auth será el proveedor de Google OAuth o existe otro proveedor obligatorio?
2. ¿Qué colección/sensor Copernicus será la fuente inicial del calendario?
3. ¿La nubosidad `< 10%` se evalúa sobre la escena completa o debe calcularse sobre el área seleccionada?
4. ¿Cuántos meses debe consultar el calendario por defecto?
5. Cuando haya varias imágenes elegibles el mismo día, ¿se elige la menor nubosidad o el usuario selecciona una?
6. ¿Cuál será la primera región y cuerpo de agua para calibrar Chlorophyll-a?
7. ¿Qué observaciones in situ existen, con qué protocolo, fechas, unidades y
   control de calidad?
8. ¿Qué umbrales de MAE, RMSE, sesgo y tamaño de muestra aceptará cada parámetro?
9. ¿La primera salida cuantitativa usará evalscript `FLOAT32`, Statistical API o
   GetFeatureInfo escalar?

## 11. Quality check del PRD

| Gate | Estado | Nota |
|---|---|---|
| Claridad del problema | Aprobado | La deuda actual y el resultado esperado están definidos |
| Disciplina de alcance | Aprobado | Roles, persistencia y máscaras AOI quedan fuera de v1 |
| Medición | Aprobado | Cada objetivo tiene una meta verificable; los umbrales científicos se fijan por parámetro antes de calibrar |
| Requisitos no funcionales | Aprobado con supuestos | Escala y disponibilidad deberán confirmarse |
| Conflictos | Aprobado | Vercel se define como hosting, no como proveedor de identidad |
| Señales de arquitectura | Aprobado | Integraciones, entidades, reglas y decisiones abiertas están documentadas |

## Architecture Handoff Brief

```text
╔══════════════════════════════════════════════════════╗
║         ARCHITECTURE HANDOFF BRIEF                   ║
║         Ready for /arch-review                       ║
╚══════════════════════════════════════════════════════╝

PROJECT: Oracular V2
TYPE: Fullstack evolution of an existing Vite SPA
MODE: AUDIT + incremental migration

1. DOMAIN COMPLEXITY
Level: Medium, moving toward domain-rich geospatial workflows
Core entities: User, AreaOfInterest, Indicator, Acquisition, CloudCoverage,
FeatureInfo, AnalysisSelection, CalibrationModel, InSituObservation,
QuantitativeEstimate
Core rules: real data only; cloud cover <10%; acquisition and analysis must match;
missing cloud metadata is ineligible; timestamps normalized to UTC; no
concentration without regional validation; qualitative and quantitative outputs
remain explicit states
Domain events: AreaChanged, AvailabilityLoaded, AcquisitionSelected,
IndicatorSelected, SessionChanged, CalibrationAccepted, EstimateProduced

2. TEAM & TIMELINE CONTEXT
Team size: assumed solo or small <5
Tech expertise: React, TypeScript, Vite, Leaflet
Timeline pressure: medium
Roadmap horizon: 8–12 weeks plus parameter-specific calibration cycles

3. SCALE & INFRASTRUCTURE SIGNALS
Launch scale: undefined, assumed controlled beta
Availability: best-effort initially
Infra preference: Vercel plus managed OAuth provider
Cost posture: cache external catalog reads and avoid custom infrastructure initially

4. INTEGRATION SURFACE
External APIs: Copernicus catalog/read, Copernicus WMS or imagery/read,
Nominatim/read, Google OAuth through managed auth provider
Auth: Google OAuth
Hosting: Vercel
Data sources: Copernicus imagery metadata and environmental layers, user-supplied
evalscripts, scientific literature and regional in-situ observations

5. KEY CONSTRAINTS
Stack: retain React + TypeScript + Vite unless auth requirements justify a BFF
Compliance: undefined; minimize stored personal data
Must avoid: secrets in VITE variables, direct HTTP in visual components,
simulated values presented as real, scene/date mismatch, uncalibrated indices or
rendered RGB presented as concentrations

6. OPEN ARCHITECTURE QUESTIONS
- Supabase Auth, Firebase Auth, Clerk or a small Vercel-hosted BFF?
- Does the chosen Copernicus collection support direct scene-to-render mapping?
- Scene-level cloud metadata or AOI-specific cloud calculation?
- Where should availability caching live: browser, edge/serverless, or provider?
- Where should versioned calibration datasets and model artifacts live?
- What acceptance thresholds and uncertainty representation apply per parameter?

7. NORTH STAR FOR ARCHITECTURE
Optimize first for scientific traceability and explicit uncertainty: every
quantitative pixel estimate must be reproducible from an acquisition, evalscript,
calibration model, dataset version and documented regional domain.
```

## Next step

Run `/arch-review` with the Architecture Handoff Brief above to define the
storage, versioning, validation and serving boundaries required by Fase 8 before
implementing the first quantitative Chlorophyll-a calibration.
