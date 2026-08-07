# Oracular V2 architecture

**Status:** accepted for the demo
**Last updated:** 2026-08-06

## Decision

Oracular V2 uses a feature-first React architecture with Ports & Adapters only at
external boundaries. This gives the demo testable seams without paying the
cost of a full Clean Architecture implementation.

```text
main.tsx
  └─ app/bootstrap + app/services (composition root)
       └─ React UI
            └─ small feature ports + domain types
                 ▲
                 └─ provider adapters (Copernicus, Nominatim)
```

Dependencies point inward:

- UI may depend on domain types and ports.
- Adapters implement ports and translate external DTOs.
- Domain code does not import React, Leaflet, `fetch` or environment variables.
- `src/app/services.ts` is the only place that chooses concrete providers.
- Public runtime configuration is read and validated in `src/app/config.ts`.

## Folder responsibilities

```text
src/
  app/                     application bootstrap, config and composition
  components/              current presentation and Leaflet integration
  features/<capability>/
    domain/                provider-independent values and rules
    ports/                 small contracts required by the app
    adapters/              HTTP/provider-specific implementations
  shared/                  reusable UI and infrastructure with no feature owner
```

The current `Map` component remains the workspace coordinator. Network calls,
provider URLs, DTO mapping, date conversion, Leaflet bootstrap and indicator
catalog configuration have been moved out. Further UI extraction should be
incremental and driven by a real feature change, not by a target folder tree.

## KISS rules for the demo

1. Add a layer only when it isolates an external provider or a rule with tests.
2. Keep local UI state in React; add a reducer when transitions become invalid,
   and a global store only when multiple routes truly share mutable state.
3. Keep browser-safe public configuration under `VITE_`; secrets belong in a
   Vercel Function or managed backend and never in the bundle.
4. Do not add repositories, facades or use-case classes that merely forward one
   call. Prefer a small typed port and a plain function.
5. New indicators belong in the typed indicator/measurement configuration, not
   in new conditionals inside `Map`.
6. New providers must map their DTOs in an adapter and expose stable domain
   values to the UI.

## Extension path

- **Google authentication:** introduce an `AuthSession` port and a managed-auth
  adapter. Server-side token exchange stays outside the SPA.
- **Copernicus calendar:** evolve `AcquisitionDateProvider` to return acquisition
  metadata when the UI needs scene identity, cloud coverage or pagination.
- **Scientific analysis:** add a scalar-analysis provider instead of deriving a
  scientific value from display pixels.
- **Server boundary:** add Vercel Functions only for secrets, authorization,
  shared caching or provider rate limiting.

## Quality gate

Every architectural slice must pass `npm run check`. Provider behavior and pure
domain rules require unit tests; the visible workflow requires an integration
test. Public Preview and production readiness remain separate release gates.
