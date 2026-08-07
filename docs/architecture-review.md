# Oracular V2 — Architecture Review and Migration Plan

> **Historical baseline (2026-08-01).** Slices B-D are now implemented and the
> current dependency rules live in [`docs/architecture.md`](./architecture.md).
> This document remains as the original audit and migration rationale.

**Fecha:** 2026-08-01
**Modo:** Audit + migración incremental
**Fuente:** `docs/product-roadmap.md` y código actual
**Decisión principal:** arquitectura frontend por features con Ports & Adapters en los límites externos y BFF ligero mediante Vercel Functions cuando exista un secreto, caché compartida o autorización de servidor.

## 1. Architecture Fingerprint

### Estado actual

Oracular V2 es una SPA React + TypeScript + Vite con estructura nominal por componentes, pero comportamiento monolítico. `src/App.tsx` solo compone `Layout` y `Map`; `src/components/Map/Map.tsx` concentra:

- Configuración y render de Leaflet.
- Navegación y paneles.
- Catálogo de indicadores y reglas de calidad.
- Llamadas directas a Copernicus y Nominatim.
- Estado de búsqueda, fechas, dibujo, capas y resultados.
- Descarga de archivos.
- Simulación de valores analíticos.

**Patrón detectado:** component-based SPA no estratificada.
**Confianza:** alta.
**Adecuación al roadmap:** baja; autenticación, catálogo temporal y trazabilidad ampliarían el acoplamiento actual.

### Arquitectura objetivo

Adoptar una combinación deliberadamente ligera:

1. **Feature-based frontend** para co-localizar UI, estado y casos de uso por capacidad.
2. **Ports & Adapters** solamente alrededor de Copernicus, geocodificación, autenticación y persistencia.
3. **Dominio funcional tipado** para adquisiciones, indicadores, calidad y selección analítica.
4. **BFF serverless en Vercel** para operaciones con secretos, caché compartida, rate limiting o autorización; no para toda interacción del mapa.

No se recomienda migrar a microservicios, CQRS, Clean Architecture completa ni micro-frontends: el tamaño y equipo asumido no justifican ese costo.

## 2. SOLID Violations Scan

| Principio | Evidencia | Problema | Corrección concreta |
|---|---|---|---|
| S — Single Responsibility | `src/components/Map/Map.tsx:187-737` | Un componente controla UI, dominio, red, Leaflet y descarga | Extraer features, hooks y adaptadores; dejar `MapPage` como composición |
| S — Single Responsibility | `src/components/Map/DrawControl.tsx:17-50` | El efecto crea controles, administra capas, serializa y dispara descarga | Separar control Leaflet de serialización/exportación |
| O — Open/Closed | `src/components/Map/Map.tsx:281-310` | Añadir un indicador obliga a modificar el `switch` | Mover evaluación a estrategias declaradas por indicador |
| O — Open/Closed | `src/components/Map/Map.tsx:352-370` | La simulación repite otro `switch` por capa | Eliminar simulación; resolver por un puerto `FeatureInfoProvider` |
| L — Liskov Substitution | No hay jerarquías relevantes | No se detecta una violación directa; tampoco existen contratos intercambiables | Introducir contratos pequeños verificables para proveedores |
| I — Interface Segregation | No existen puertos de integración | La UI conoce detalles completos de cada API y no puede depender de capacidades mínimas | Definir `SearchPlaces`, `ListAcquisitions`, `GetFeatureInfo` y `AuthSession` separados |
| D — Dependency Inversion | `src/components/Map/Map.tsx:133-146` y `240-258` | Código de alto nivel depende de URLs, `fetch`, XML y JSON concretos | Inyectar puertos y mapear DTOs en adapters |
| D — Dependency Inversion | `src/components/Map/Map.tsx:31-38` | Configuración global de Leaflet ocurre al importar el componente | Mover bootstrap Leaflet a `app/bootstrap/leaflet.ts` |

### Riesgos funcionales asociados

- `Map.tsx:336-350` construye parámetros WMS que nunca utiliza.
- `Map.tsx:352-379` muestra valores aleatorios como resultados.
- `Map.tsx:133-146` descarga capabilities pero solo imprime el XML.
- `DrawControl.tsx:42-44` exporta KML placeholder, no la geometría dibujada.
- `Map.tsx:225-237` añade una espera artificial de tres segundos.
- `Map.tsx:403-412` registra un handler recreado y ya genera advertencia de hooks.

## 3. Design Pattern Opportunities

| Anti-pattern actual | Patrón recomendado | Aplicación en Oracular V2 |
|---|---|---|
| HTTP directo desde UI | Adapter + Port | `CopernicusCatalogAdapter`, `WmsFeatureInfoAdapter`, `NominatimAdapter` |
| Condicionales por indicador | Strategy | Cada `IndicatorDefinition` aporta su regla de calidad |
| Estado distribuido en muchos `useState` | Reducer / state machine ligera | Un reducer para selección: AOI → indicador → adquisición → resultado |
| Construcción manual de URLs WMS | Builder/Factory | `WmsRequestBuilder` validado y probado |
| DTOs externos usados directamente | Mapper / Anti-corruption layer | Convertir respuestas a `Acquisition` y `FeatureInfo` internos |
| Catálogo remoto sin caché | Repository | `AcquisitionRepository` con adapter remoto y caché |
| Componente dios | Facade + composición | `MapWorkspace` consume casos de uso y compone paneles |
| Efectos transversales dispersos | Middleware/wrapper | Cliente HTTP común con timeout, cancelación y errores normalizados |

### Contratos mínimos propuestos

```ts
export interface ListAcquisitions {
  execute(query: AcquisitionQuery, signal?: AbortSignal): Promise<Acquisition[]>;
}

export interface GetFeatureInfo {
  execute(selection: AnalysisSelection, point: GeoPoint): Promise<FeatureInfo>;
}

export interface AuthSession {
  current(): Promise<UserSession | null>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}
```

Los componentes no reciben `fetch`, URLs, XML, tokens ni DTOs de terceros.

## 4. Layering & Dependency Direction

### Actual

```text
App
 └─ Map.tsx
     ├─ React UI + responsive state
     ├─ Leaflet lifecycle
     ├─ Nominatim fetch
     ├─ Copernicus WMS fetch
     ├─ indicator rules
     ├─ simulated analytics
     └─ KML download
```

### Recomendado

```text
app/composition
      │
      ▼
feature UI ──► feature use-cases ──► domain
                      │                ▲
                      ▼                │
                    ports ◄──────── adapters
                      │
              ┌───────┴────────┐
              ▼                ▼
       browser adapters   Vercel BFF adapters
       Leaflet/UI-only    secrets/cache/authz
```

### Regla de dependencia

```text
UI → application/use-cases → domain
adapters → ports + domain
domain → nothing external
api/Vercel → server use-cases → external providers
```

Nunca deben existir dependencias `domain → React`, `domain → Leaflet`, `domain → fetch` ni `UI → proveedor externo`.

## 5. Scalability & Maintainability Score

| Dimensión | Actual | Objetivo tras Fase 3 | Justificación |
|---|---:|---:|---|
| Testability | 1/5 | 4/5 | No hay tests y la lógica está dentro de componentes; los puertos permiten mocks deterministas |
| Changeability | 2/5 | 4/5 | Cambiar WMS o geocoder requiere editar UI; adapters aíslan proveedores |
| Onboarding clarity | 2/5 | 4/5 | README y scripts mezclan frontend con Task Master; features y ADRs aclaran límites |
| Domain expressiveness | 2/5 | 4/5 | Solo existen strings y objetos parciales; se necesitan entidades y reglas explícitas |
| Runtime resilience | 2/5 | 4/5 | No hay timeout/cancelación/errores normalizados; el cliente común resuelve esto |

## 6. Prioritized Action Plan

### Quick wins — horas

1. Fijar Node LTS y documentar comandos soportados.
2. Resolver scripts rotos y separar dependencias CLI de runtime.
3. Dejar `npm run build` y `npm run lint` verdes.
4. Definir tipos `Indicator`, `SearchResult`, `FeatureInfo` y eventos Leaflet.
5. Eliminar espera artificial y etiquetar temporalmente resultados simulados como demo.
6. Crear ADRs para auth, fuente Copernicus y política de nubosidad.

### Medium refactors — días

1. Extraer configuración y reglas de indicadores a `features/analysis/domain`.
2. Extraer navegación y paneles de `Map.tsx` sin cambiar comportamiento.
3. Introducir adapters para Nominatim y WMS.
4. Implementar `GetFeatureInfo` real y eliminar simulación.
5. Añadir reducer de selección y garantizar el invariante adquisición/análisis.
6. Añadir tests unitarios y de integración antes del calendario.

### Architectural migrations — semanas

1. Migrar a estructura por features mediante strangler pattern, sin reescritura total.
2. Añadir `features/auth` con proveedor gestionado y guard de aplicación.
3. Añadir `features/acquisitions` con catálogo, filtro `<10%` y caché.
4. Añadir BFF Vercel únicamente para credenciales, caché o autorización.
5. Añadir observabilidad, CI y despliegue Preview verificable.

## 7. Target Folder Structure

```text
src/
  app/
    App.tsx
    bootstrap/
      leaflet.ts
    providers/
      AuthProvider.tsx
    routes/
      ProtectedApp.tsx

  features/
    map-workspace/
      components/
        MapCanvas.tsx
        MapWorkspace.tsx
        TopNavigation.tsx
      hooks/
        useMapSelection.ts
      model/
        map-selection.reducer.ts

    analysis/
      components/
        IndicatorsPanel.tsx
        IndicatorDetails.tsx
        FeatureInfoPanel.tsx
      domain/
        indicator.ts
        quality.ts
        feature-info.ts
      application/
        get-feature-info.ts
      ports/
        feature-info-provider.ts
      adapters/
        copernicus-wms-feature-info.ts

    acquisitions/
      components/
        AcquisitionCalendar.tsx
        AcquisitionPicker.tsx
      domain/
        acquisition.ts
        cloud-coverage.ts
      application/
        list-eligible-acquisitions.ts
      ports/
        acquisition-repository.ts
      adapters/
        copernicus-catalog.ts

    auth/
      components/
        LoginPage.tsx
      application/
        restore-session.ts
      ports/
        auth-session.ts
      adapters/
        supabase-auth.ts

    place-search/
      components/
        PlaceSearch.tsx
      ports/
        geocoder.ts
      adapters/
        nominatim-geocoder.ts

  shared/
    http/
      http-client.ts
      provider-error.ts
    geo/
      geo-point.ts
      area-of-interest.ts
    ui/
      LoadingState.tsx
      ErrorState.tsx

api/
  acquisitions.ts
  health.ts

docs/
  adr/
    0001-auth-provider.md
    0002-copernicus-source.md
    0003-cloud-policy.md
```

No es necesario crear toda la estructura de una vez. Cada carpeta aparece cuando se migra su primera responsabilidad real.

## 8. Key Architectural Rules

1. Ningún componente React llama directamente a APIs externas.
2. El dominio no importa React, Leaflet, SDKs, `fetch` ni variables de entorno.
3. Cada integración externa implementa un puerto pequeño y específico.
4. Una selección analítica válida contiene `acquisitionId`, colección, timestamp e indicador.
5. Nubosidad ausente o `>= 10` nunca produce una adquisición elegible.
6. Los secretos solo existen en proveedor gestionado o funciones serverless; ninguna variable secreta usa prefijo `VITE_`.
7. Las features solo exponen un API público; no importan internals de otra feature.
8. Todo estado externo representa explícitamente `idle | loading | success | empty | error`.
9. Build, lint y tests son gates obligatorios antes de Preview.

## 9. Migration Sequence

### Slice A — Base segura

- ADRs, Node LTS, higiene Git, scripts válidos y gates.
- No cambia comportamiento de usuario.

### Slice B — Dominio extraído

- Tipos de indicadores, reglas de calidad y selección analítica.
- Tests unitarios antes de mover UI.

### Slice C — Adapters existentes

- Nominatim y WMS detrás de puertos.
- `Map.tsx` conserva la UI pero deja de conocer HTTP.

### Slice D — Dato real

- Implementar FeatureInfo real.
- Eliminar `Math.random()` y placeholders analíticos.

**Estado 2026-08-01:** parcial. Adapter WMS, errores y trazabilidad implementados; simulación eliminada. Bloqueado para valores científicos hasta disponer de una salida escalar del proveedor.

### Slice E — UI por features

- Extraer paneles y navegación.
- Corregir responsive sin mezclarlo con cambios de datos.

### Slice F — Hosting y auth

- Preview Vercel estable.
- Auth Google detrás de `AuthSession`.

### Slice G — Catálogo temporal

- `ListEligibleAcquisitions` consulta catálogo y filtra `<10%`.
- El calendario consume adquisiciones del dominio, no fechas sueltas.

## 10. Decision Records Required

| ADR | Decisión | Recomendación provisional | Bloquea |
|---|---|---|---|
| 0001 | Proveedor Google OAuth | Supabase Auth | Fase 6 |
| 0002 | Colección y endpoint Copernicus | Spike técnico con escena trazable | Fases 1 y 7 |
| 0003 | Política de nubosidad | Metadato de escena `<10%`; AOI mask en v2 | Fase 7 |
| 0004 | Selección múltiple diaria | Menor nubosidad por defecto y selector opcional | Fase 7 |
| 0005 | Límite del BFF | Solo secretos, caché, rate limiting y authz | Fases 5–7 |

## 11. What to Avoid

- Reescribir toda la aplicación antes de entregar valor.
- Mover `Map.tsx` a otra carpeta sin separar responsabilidades.
- Añadir un store global para todo el estado de UI.
- Hacer del BFF un proxy genérico sin reglas de dominio.
- Usar fecha como identidad de una escena.
- Filtrar nubosidad solo en UI después de descargar todas las escenas.
- Exponer tokens o secretos como `VITE_*`.
- Añadir nuevos indicadores mientras FeatureInfo siga simulado.
- Mezclar en el mismo PR refactor estructural, cambio visual y cambio de proveedor.

## Next step

Ejecutar **Slice A — Base segura**: fijar Node LTS, decidir el destino de Task Master, limpiar el alcance versionado y crear los tres ADRs iniciales antes de mover código funcional.
