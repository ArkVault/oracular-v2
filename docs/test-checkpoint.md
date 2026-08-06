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
