# Oracular V2 — Phase 0 Baseline

**Fecha:** 2026-08-01
**Estado:** Auditoría read-only completada
**Propósito:** convertir Slice A del architecture review en una cola ejecutable sin alterar todavía el árbol de trabajo.

## 1. Resumen de estado

La aplicación puede ejecutarse y Vite genera un bundle, pero el repositorio todavía no tiene una baseline reproducible. El build actual no ejecuta TypeScript, los gates fallan, Task Master está incompleto y miles de archivos generados continúan versionados.

> **Actualización 2026-08-01:** se añadió `typecheck`, una suite Vitest, cobertura, integración, smoke y el gate `check`. Los 13 errores TypeScript y los errores/warnings originales de lint fueron corregidos. La evidencia inferior conserva el estado de auditoría previo para trazabilidad; Git hygiene, toolchain y Task Master siguen pendientes.

| Área | Estado | Evidencia principal |
|---|---|---|
| Runtime | Bloqueado | Node local 26 sin versión fijada; una dependencia ya advierte incompatibilidad |
| Build Vite | Pasa con limitaciones | `vite build` no ejecuta `tsc` |
| TypeScript | Falla | 13 errores con `tsc -p tsconfig.app.json --noEmit` |
| Lint | Falla | 4 errores y 2 warnings |
| Tests | Ausentes | Sin runner, archivos ni script `test` |
| Git hygiene | Crítico | 23,065 archivos de `node_modules` rastreados |
| Task Master | Roto | Falta `scripts/modules/commands.js` |
| Vercel | Parcial | CLI instalada; proyecto/configuración reproducible todavía ausente |
| Documentación | Incorrecta | README y `.env.example` describen Task Master, no Oracular V2 |

## 2. Evidencia

### Runtime y package manager

- Node local: `v26.0.0`.
- npm local: `11.12.1`.
- No existen `.nvmrc`, `.node-version`, `.tool-versions`, `volta.json` ni `engines`.
- `package-lock.json` usa lockfile v3 y npm es el package manager implícito.
- El README solo declara Node 14 o superior, lo cual no representa el toolchain actual.

### Quality gates

`package.json` incluye `dev`, `build`, `lint`, `preview`, `deploy` y scripts rotos de Task Master, pero no incluye:

- `typecheck`
- `test`
- `test:e2e`
- Un gate agregado tipo `check`

El build ejecuta solamente:

```text
vite build
```

Por ello puede finalizar con éxito aunque el programa tenga errores TypeScript.

#### Lint actual

```text
npm run lint -- --no-cache
→ 4 errores y 2 warnings
```

- `src/components/Map/DrawControl.tsx:39`: `any`.
- `src/components/Map/DrawControl.tsx:51`: dependencia de hook ausente.
- `src/components/Map/Map.tsx:189`: `any`.
- `src/components/Map/Map.tsx:225`: `any`.
- `src/components/Map/Map.tsx:336`: variable sin uso.
- `src/components/Map/Map.tsx:412`: dependencia de hook ausente.

#### TypeScript actual

```text
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
→ 13 errores
```

Las familias detectadas incluyen:

- `SearchResult` inexistente.
- Indexación insegura de records.
- Parámetros implícitamente `any`.
- Importaciones sin uso.
- Opciones Leaflet incompatibles.

No existen archivos de tests, configuración Vitest/Jest/Playwright/Cypress ni workflows de CI.

### Git hygiene

```text
branch: main
HEAD: 465c041e Pixel value on click panel
git ls-files node_modules | wc -l → 23065
git ls-files dist | wc -l → 3
```

- `node_modules` ocupa aproximadamente 521 MB localmente.
- `dist` ocupa aproximadamente 496 KB.
- `.gitignore` ignora `node_modules`, pero está sin rastrear y no afecta archivos ya incluidos en el índice.
- `dist` no está ignorado.
- El árbol contiene cambios masivos generados dentro de `node_modules` y `dist`.
- `.gitignore`, `.env.example`, README, documentación y `scripts/` también están sin rastrear.

No debe realizarse una limpieza destructiva hasta clasificar y preservar todos los cambios del usuario.

### Task Master

`package.json` publica `list`, `generate` y `parse-prd`, que invocan `scripts/dev.js`. Ese archivo importa:

```js
import { runCLI } from './modules/commands.js';
```

`scripts/modules/commands.js` no existe, por lo que los tres comandos están rotos. Además, las numerosas dependencias de servidor/IA/CLI parecen pertenecer a esta integración y no al frontend Oracular V2.

### Vercel

- `vercel@58.4.4` está en `devDependencies`.
- Existen scripts Preview y Production.
- No existen `vercel.json`, `.vercelignore` ni vínculo local `.vercel/project.json`.
- El proyecto todavía no tiene Preview reproducible verificado desde un clon limpio.

### Documentación y entorno

- README documenta Task Master en lugar de Oracular V2.
- `.env.example` solo contiene Anthropic/Perplexity/Task Master.
- `src` no utiliza actualmente `import.meta.env`.
- No hay secretos rastreados detectados en archivos `.env*`.
- La documentación nueva todavía está sin rastrear y no forma parte de `HEAD`.

## 3. Checklist priorizado

### P0.1 — Preservar y clasificar el árbol actual

- [ ] Generar inventario de cambios por categoría: producto, tooling, Task Master, dependencias y artefactos.
- [ ] Confirmar qué cambios del usuario deben conservarse.
- [ ] Separar cualquier limpieza en un cambio revisable.

**Aceptación:** ningún archivo del usuario se pierde y cada grupo de cambios tiene destino explícito.

### P0.2 — Resolver alcance versionado

- [ ] Incorporar `.gitignore`.
- [ ] Retirar `node_modules` del índice sin borrar la copia local.
- [ ] Decidir si `dist` se genera solo en CI/Vercel; recomendación: no versionarlo.
- [ ] Confirmar que artefactos generados no reaparecen tras `npm ci` o `npm run build`.

**Aceptación:**

```text
git ls-files node_modules → vacío
git ls-files dist → vacío, si se adopta la recomendación
git status → solo cambios intencionales y revisables
```

### P0.3 — Fijar toolchain

- [ ] Fijar Node 24 LTS en `.nvmrc` y `package.json#engines`.
- [ ] Usar Node 22 LTS solo si una dependencia demuestra incompatibilidad con 24.
- [ ] Declarar `packageManager` para npm.
- [ ] Verificar `npm ci` desde un clon limpio.

**Aceptación:** instalar con la versión fijada no cambia `package-lock.json`.

### P0.4 — Resolver Task Master

**Recomendación:** retirarlo de Oracular V2 junto con scripts, documentación y dependencias exclusivas.

Alternativa: restaurar íntegramente `scripts/modules` y aislar su grafo fuera del runtime del frontend.

**Aceptación:** ningún script publicado falla y README describe Oracular V2.

### P0.5 — Establecer gates reales

- [x] Corregir 4 errores y 2 warnings de lint.
- [x] Corregir 13 errores TypeScript.
- [x] Añadir `typecheck`.
- [x] Añadir test unitario y smoke test mínimo.
- [x] Añadir un script `check` que ejecute lint, typecheck, tests y build.
- [ ] Ejecutar los gates en CI.

**Aceptación:** todos los comandos terminan en código 0 desde un entorno limpio; Vite no puede ocultar errores TypeScript.

### P1.1 — Reducir dependencias

- [ ] Clasificar dependencias como frontend, tooling, Task Master o sin uso.
- [ ] Eliminar dependencias huérfanas después de decidir Task Master.
- [ ] Reinstalar desde lockfile limpio.
- [ ] Ejecutar auditoría externa autorizada y priorizar por alcance productivo.

**Aceptación:** `npm ls --depth=0` no contiene dependencias extraneous o invalid.

### P1.2 — Documentar Oracular V2 y variables

- [ ] Reemplazar README por instalación y operación de Oracular V2.
- [ ] Documentar desarrollo, gates, Preview y Production.
- [ ] Reducir `.env.example` a variables realmente utilizadas.
- [ ] Documentar que secretos OAuth/Copernicus nunca usan `VITE_*`.

**Aceptación:** una persona nueva levanta y valida el proyecto solo con README y `.env.example`.

### P1.3 — Baseline Vercel

- [ ] Mantener Vercel CLI en `devDependencies`.
- [ ] Vincular el proyecto con el equipo/cuenta correctos.
- [ ] Verificar autodetección Vite, build y output `dist`.
- [ ] Separar Development, Preview y Production.
- [ ] Documentar Preview y rollback.

**Aceptación:** Preview reproducible desde un clon limpio. Producción permanece fuera de alcance hasta completar auth y validación.

## 4. Decisiones requeridas al usuario

| Decisión | Recomendación | Impacto |
|---|---|---|
| Task Master | Retirarlo de este repositorio | Desbloquea limpieza de scripts y dependencias |
| Proveedor Google OAuth | Supabase Auth | Define redirects y `features/auth` |
| Colección Copernicus | Spike técnico antes de implementar calendario | Define catálogo y vínculo escena-render |
| Política de nubosidad | Escena `<10%` en v1; AOI en v2 | Controla costo y precisión |
| Varias escenas el mismo día | Menor nubosidad por defecto | Define UX y regla determinista |
| Rango de calendario | Pendiente | Define volumen de consulta y caché |
| Vercel | Confirmar cuenta/equipo y dominio | Necesario para Preview, OAuth y Production |

## 5. Decisiones técnicas seguras

- npm se mantiene por existir `package-lock.json`.
- Node 24 LTS es el baseline recomendado.
- `node_modules` no debe permanecer rastreado.
- `dist` no debe versionarse si Vercel genera el artefacto.
- `typecheck` debe ser un gate separado y obligatorio.
- Vercel CLI permanece en `devDependencies`.
- Secretos nunca usan `VITE_*`.
- Nubosidad `10.0%` y metadato ausente son no elegibles.
- No se declarará build, seguridad o deploy verificado hasta repetirlo desde instalación limpia.

## Next step

Obtener la decisión del usuario sobre **retirar o conservar Task Master**. Con esa decisión se puede implementar P0.1–P0.4 sin riesgo de eliminar trabajo intencional.
