# Orber — Roadmap de estabilización y evolución

**Versión:** 1.0
**Fecha:** 2026-08-01
**Estado:** Draft para validación
**Horizonte propuesto:** 8–12 semanas para un equipo pequeño

## 1. Resumen ejecutivo

Orber es una SPA geoespacial para explorar imágenes de Copernicus y analizar indicadores ambientales sobre un mapa. Antes de ampliar el producto, el proyecto debe asegurar la integridad de los datos, reducir deuda técnica, incorporar pruebas, corregir la experiencia responsive y establecer una entrega reproducible en Vercel.

Después de esa estabilización, el roadmap incorpora autenticación con Google y un calendario que únicamente permita seleccionar fechas con imágenes Copernicus cuya nubosidad reportada sea inferior al 10%.

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

**Checkpoint 2026-08-01:** `GetFeatureInfo` real está integrado y la simulación fue eliminada. La instancia devuelve escena, fecha, nubosidad y canales renderizados; Orber los trata explícitamente como no escalares. Sigue pendiente configurar una salida científica escalar o adoptar Statistical API para completar la fase.

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

**Checkpoint 2026-08-01:** baseline local en progreso. Existen 13 tests unitarios, 2 de integración, 1 smoke test, cobertura del dominio crítico y un gate `check` verde. El loader actual de `orber-geospatial-insights` quedó integrado y probado. CI y E2E permanecen pendientes; ver `docs/test-checkpoint.md`.

### Fase 4 — Responsive, accesibilidad y UX de mapa (1 semana)

**Objetivo:** hacer usable el producto en móvil, tablet y escritorio.

- Convertir los paneles laterales en drawers adaptables.
- Evitar superposición y overflow horizontal.
- Crear navegación compacta para móvil.
- Añadir nombres accesibles, foco visible y operación por teclado.
- Diseñar estados vacíos y de error consistentes.

**Criterio de salida:** los flujos P0 funcionan en 375, 768 y 1440 px sin contenido inaccesible.

**Checkpoint 2026-08-01:** se integró el lenguaje visual modular de `orber-geospatial-insights`: header de cristal, paneles flotantes, navegación compacta, popovers de fechas/sensores, estados activos y adaptación móvil. La composición fue validada manualmente en 375 y 1440 px sin overflow horizontal; quedan pendientes E2E responsive y auditoría completa de accesibilidad.

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
```

La investigación de catálogo Copernicus puede ejecutarse en paralelo desde la Fase 2, pero su implementación productiva comienza después de autenticación.

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El WMS actual no expone adquisiciones ni tiempo suficiente | Calendario bloqueado | Usar catálogo para descubrir escenas y un adaptador separado para renderizar |
| Nubosidad global baja pero nubes sobre el área de interés | Análisis pobre | Comenzar con metadato de escena y evaluar máscara de nubes por AOI como v2 |
| Callbacks OAuth variables en Preview | Login inconsistente | Usar callback estable del proveedor y allowlist controlada |
| APIs externas lentas o limitadas | UX degradada | Caché, cancelación, rate limits y mensajes explícitos |
| Dependencias actuales vulnerables | Riesgo de release | Auditoría por alcance y upgrades incrementales antes de producción |

## 9. Fuera de alcance de este roadmap

- Roles administrativos y permisos granulares.
- Guardado de proyectos o áreas por usuario.
- Máscaras de nubes calculadas píxel a píxel sobre el AOI.
- Procesamiento asíncrono pesado o exportaciones analíticas.
- Nuevos indicadores ambientales antes de validar los actuales.

## 10. Preguntas abiertas

1. ¿Supabase Auth será el proveedor de Google OAuth o existe otro proveedor obligatorio?
2. ¿Qué colección/sensor Copernicus será la fuente inicial del calendario?
3. ¿La nubosidad `< 10%` se evalúa sobre la escena completa o debe calcularse sobre el área seleccionada?
4. ¿Cuántos meses debe consultar el calendario por defecto?
5. Cuando haya varias imágenes elegibles el mismo día, ¿se elige la menor nubosidad o el usuario selecciona una?

## 11. Quality check del PRD

| Gate | Estado | Nota |
|---|---|---|
| Claridad del problema | Aprobado | La deuda actual y el resultado esperado están definidos |
| Disciplina de alcance | Aprobado | Roles, persistencia y máscaras AOI quedan fuera de v1 |
| Medición | Aprobado | Cada objetivo tiene una meta verificable |
| Requisitos no funcionales | Aprobado con supuestos | Escala y disponibilidad deberán confirmarse |
| Conflictos | Aprobado | Vercel se define como hosting, no como proveedor de identidad |
| Señales de arquitectura | Aprobado | Integraciones, entidades, reglas y decisiones abiertas están documentadas |

## Architecture Handoff Brief

```text
╔══════════════════════════════════════════════════════╗
║         ARCHITECTURE HANDOFF BRIEF                   ║
║         Ready for /arch-review                       ║
╚══════════════════════════════════════════════════════╝

PROJECT: Orber
TYPE: Fullstack evolution of an existing Vite SPA
MODE: AUDIT + incremental migration

1. DOMAIN COMPLEXITY
Level: Medium, moving toward domain-rich geospatial workflows
Core entities: User, AreaOfInterest, Indicator, Acquisition, CloudCoverage,
FeatureInfo, AnalysisSelection
Core rules: real data only; cloud cover <10%; acquisition and analysis must match;
missing cloud metadata is ineligible; timestamps normalized to UTC
Domain events: AreaChanged, AvailabilityLoaded, AcquisitionSelected,
IndicatorSelected, SessionChanged

2. TEAM & TIMELINE CONTEXT
Team size: assumed solo or small <5
Tech expertise: React, TypeScript, Vite, Leaflet
Timeline pressure: medium
Roadmap horizon: 8–12 weeks

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
Data sources: Copernicus imagery metadata and environmental layers

5. KEY CONSTRAINTS
Stack: retain React + TypeScript + Vite unless auth requirements justify a BFF
Compliance: undefined; minimize stored personal data
Must avoid: secrets in VITE variables, direct HTTP in visual components,
simulated values presented as real, scene/date mismatch

6. OPEN ARCHITECTURE QUESTIONS
- Supabase Auth, Firebase Auth, Clerk or a small Vercel-hosted BFF?
- Does the chosen Copernicus collection support direct scene-to-render mapping?
- Scene-level cloud metadata or AOI-specific cloud calculation?
- Where should availability caching live: browser, edge/serverless, or provider?

7. NORTH STAR FOR ARCHITECTURE
Optimize first for data traceability and a simple controlled-beta deployment,
while keeping external providers replaceable behind typed adapters.
```

## Next step

Run `/arch-review` with the Architecture Handoff Brief above to turn Fases 0–2 into a concrete target architecture, folder structure and migration sequence.
