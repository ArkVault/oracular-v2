# Orber — Test Strategy

**Modo inicial:** Setup + audit
**Riesgo principal:** resultados geoespaciales no trazables y filtros temporales incorrectos

## Tooling stack

| Capa | Herramienta | Alcance inicial |
|---|---|---|
| Unit | Vitest | Reglas puras de calidad y nubosidad |
| Integration | Vitest + Testing Library + jsdom | Estado React → capa WMS |
| Smoke | Node fetch | Shell de Orber en localhost o Preview |
| Coverage | Vitest V8 | Dominio crítico, gate mínimo 90% |
| E2E futuro | Playwright | Login Google y calendario completo |

## Pirámide objetivo

```text
Unit 70% | Integration 20% | E2E/Smoke 10%
```

## Convenciones

- Unitarios co-localizados: `*.test.ts`.
- Integración: `tests/integration/*.test.tsx`.
- Smoke: `tests/smoke/*.mjs`.
- Patrón AAA obligatorio.
- Sin red real en unitarios o integración.
- Sin temporizadores reales ni datos aleatorios.
- Solo se mockean límites externos, no reglas de dominio.

## Gates

- PR: lint, typecheck, unit, integración, cobertura y build.
- Preview: smoke contra `SMOKE_BASE_URL`.
- Main futuro: E2E de autenticación y análisis.
- Código nuevo de dominio: mínimo 90%.
- Cobertura global completa se incorporará progresivamente al extraer el monolito.

## Flujos críticos pendientes

1. Calibración escalar validada para los valores obtenidos mediante
   `GetFeatureInfo`.
2. Login, restauración y cierre de sesión con Google.
3. Calendario: 9.99% elegible; 10%, ausente o inválido no elegible.
4. Adquisición seleccionada idéntica en mapa y análisis.
5. Responsive en 375, 768 y 1440 px.
