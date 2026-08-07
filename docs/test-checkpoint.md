# TEST CHECKPOINT — Roadmap Sync

**Fecha:** 2026-08-01
**Feature:** Baseline de calidad + análisis/adquisiciones + loader integrado
**Test status:** ⚠️ PARTIAL

## Resultados verificados

| Capa | Escritos | Resultado |
|---|---:|---|
| Unit | 13 | ✅ Pasa |
| Integration | 3 | ✅ Pasa |
| Smoke localhost | 1 | ✅ HTTP 200 |
| E2E | 0 | ❌ Pendiente |

## Cobertura

- Antes: no existía medición.
- Después: 98.46% statements, 94.44% branches, 100% functions y 98.36% lines en los módulos críticos incluidos.
- Alcance actual: `src/features/**/domain/**/*.ts` y el adaptador WMS de Copernicus.
- La cobertura no representa todavía todo el monolito `Map.tsx`.

## Comportamientos protegidos

- Límites de calidad para clorofila.
- Dirección inversa de calidad para oxígeno disuelto.
- Indicadores desconocidos devuelven `Unknown`.
- Nubosidad `9.99%` es elegible y `10%` no lo es.
- Nubosidad ausente, negativa, mayor a 100 o `NaN` no es elegible.
- La UI primaria renderiza controles de análisis.
- Seleccionar clorofila monta la capa WMS `CHLA`.
- El Warp Loader importado de `orber-geospatial-insights` solo aparece durante carga y expone un estado accesible.
- El shell modular muestra la marca Orber, búsqueda accesible y mantiene Dates/Sensors mutuamente excluyentes.
- El localhost responde con el shell HTML de Orber.

## Gates

```text
npm run lint          → PASS
npm run typecheck     → PASS
npm run test          → PASS (16/16)
npm run test:coverage → PASS (módulos críticos sobre umbral)
npm run build         → PASS
npm run test:smoke    → PASS
```

## Preparación

**Ready for:** continuar refactor local y abrir un Preview técnico cuando el repositorio tenga baseline limpia.
**Not ready for:** producción.

## Bloqueos restantes

- La capa CHLA todavía devuelve canales renderizados en lugar de un valor científico escalar.
- No existen pruebas E2E de mapa real, auth o calendario.
- Cobertura global del frontend todavía no está medida.
- Git hygiene, Node LTS y Task Master continúan pendientes.
- Las vulnerabilidades de dependencias no están auditadas por alcance.

## Roadmap update

**Fase 3 — Testing y gates de calidad:** en progreso.
Baseline unitaria, integración, smoke, cobertura y gate local: ✅
CI y E2E: pendientes.

**Fase 4 — Responsive, accesibilidad y UX:** parcial. El shell visual de `orber-geospatial-insights` quedó adaptado a la lógica real, verificado manualmente en 375 y 1440 px sin overflow horizontal. Falta formalizar E2E responsive y revisar contenido/descripciones.

## Checkpoint — GetFeatureInfo real

**Fecha:** 2026-08-01
**Test status:** ✅ TESTED en adapter y verificado en localhost

- Se añadieron 6 tests del adaptador WMS.
- Se verifican parámetros WMS 1.3, orden de ejes EPSG:4326 y rango temporal.
- Se cubren valor escalar, canales renderizados, ausencia de cobertura y error HTTP.
- Se añadió regresión para el binding de `window.fetch` detectado en navegador.
- `Math.random()` y el flujo de valores simulados fueron eliminados.
- La prueba live devolvió escena, fecha y nubosidad reales sin presentar RGB como mg/m³.

**Estado de Fase 1:** parcial. El transporte y la trazabilidad son reales; la configuración actual de `CHLA` devuelve `out1/out2/out3`, por lo que se necesita una capa de salida escalar o Statistical API antes de mostrar un valor científico.

## Checkpoint — Refactor arquitectónico ligero

**Fecha:** 2026-08-06
**Test status:** ✅ TESTED

- TDD rojo: configuración, fechas y búsqueda fallaron inicialmente porque los
  módulos y contratos todavía no existían.
- TDD verde: se añadieron puertos/adaptadores, composición de servicios,
  configuración validada y bootstrap Leaflet aislado.
- Regresión completa: 13 suites y 46 tests pasan.
- Cobertura crítica: 96.73% statements, 91.82% branches, 97.61% functions y
  97.67% lines.
- `npm run check`: lint, typecheck, cobertura y build pasan.

**Roadmap sync:** la base mantenible del demo queda completada. El próximo slice
arquitectónico debe acompañar una capacidad real (auth, catálogo con metadata o
análisis escalar), no una separación adicional puramente estructural.

## Checkpoint — Detección de color por píxel y zoom

**Fecha:** 2026-08-06
**Test status:** ⚠️ PARTIAL

- La consulta `GetFeatureInfo` usa ahora el CRS, bounding box, tamaño y posición
  interna de la tesela WMS de 256 px realmente mostrada por Leaflet.
- La inversión de la rampa muestrea 256 matices por segmento y tolera cambios
  moderados de brillo sin aceptar negro/no-data.
- Un RGB coloreado que no exista en la rampa local ya no se etiqueta como
  “Out of the area”; se informa como color pendiente de calibración.
- Verificación live: un píxel verde CHLA devolvió
  `[0.085889, 0.515674, 0.251921]` y fue identificado como no calibrado; un
  píxel negro continuó devolviendo “Out of the area of interest”.
- Regresión completa: 13 suites y 53 tests pasan.
- Cobertura crítica: 97.27% statements, 91.57% branches, 97.77% functions y
  98.05% lines.

**Bloqueo científico:** la Configuration API requiere autorización para leer el
evalscript privado del layer. Para devolver un valor numérico fiable hay que
incorporar al repositorio sus pares exactos `valor → color` o cambiar el layer
para que `GetFeatureInfo` exponga el escalar directamente.

**Roadmap sync:** alineación del clic y clasificación no-data completadas;
calibración científica de las rampas permanece parcial.
