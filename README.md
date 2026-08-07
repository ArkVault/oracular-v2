# Oracular V2

Oracular V2 is a browser-based geospatial analysis demo for exploring Copernicus
imagery and environmental indicators without requiring a desktop GIS. The
application combines an interactive Leaflet map, Sentinel Hub WMS layers,
acquisition-date discovery and point-level analysis in a responsive interface.

The repository currently represents a technical demo. It is suitable for
product validation and controlled testing, but it should not yet be treated as
a production scientific system.

## Current capabilities

- Interactive satellite basemap built with Leaflet and React Leaflet.
- Copernicus WMS visualization for natural color, chlorophyll-a, dissolved
  oxygen, total suspended solids, turbidity and forest-fire layers.
- Place search through a typed Nominatim adapter.
- Acquisition calendar populated from Copernicus WFS metadata.
- Strict cloud-coverage filtering: only acquisitions below 10 percent are
  considered eligible.
- Point selection with coordinates, acquisition metadata, cloud coverage and
  provider result state in the right-side panel.
- Parameter-specific legends with units, numeric ranges and color scales.
- Color-based point estimation when a rendered pixel can be matched to the
  configured parameter scale.
- Explicit out-of-area and no-data states when a point cannot be evaluated.
- Polygon and rectangle drawing controls for defining an area of interest.
- Responsive glass-panel interface for desktop and narrow viewports.
- Local quality gate covering lint, TypeScript, automated tests, coverage and
  production build.

## How the demo works

1. The user searches for a place or navigates directly on the map.
2. The application loads a selected Copernicus visualization layer.
3. The Dates control requests available Sentinel-2 acquisitions for the current
   map bounds and filters them by cloud coverage.
4. Selecting an acquisition updates the WMS time range used by the layer.
5. Clicking the map requests feature information for the selected parameter and
   displays the result, provenance and quality state in the analysis panel.

## Scientific interpretation

Oracular V2 distinguishes between scalar measurements and rendered image channels.
If Copernicus returns a scalar value, the application can present it with the
configured unit and quality range. If the provider returns only RGB or rendered
channels, Oracular V2 does not label those channels as a scientific measurement.

Color-derived values are estimates based on the displayed scale. They are useful
for interface and workflow validation, but they are not a replacement for a
validated Copernicus Statistical API workflow or a calibrated analytical model.

## Architecture

The frontend follows a lightweight feature-first architecture. Ports and
Adapters are used at external boundaries while React remains responsible for
local presentation state.

```text
src/
  app/                       Runtime configuration, bootstrap and composition
  components/                Map workspace and reusable UI components
  features/
    acquisitions/            Acquisition rules, ports and Copernicus WFS adapter
    analysis/                Measurement scales and WMS feature-info adapter
    place-search/            Search contract and Nominatim adapter
  shared/                    Shared presentation and infrastructure utilities
```

Dependency rules:

- Domain modules do not depend on React, Leaflet, network APIs or environment
  variables.
- Provider-specific DTOs are translated inside adapters.
- UI components consume small typed contracts instead of constructing external
  providers directly.
- Concrete providers are selected in `src/app/services.ts`.
- Browser configuration is validated in `src/app/config.ts`.

Design patterns are applied only where they remove a demonstrated source of
complexity:

- A reducer implements the State pattern for the Dates, Sensors and Search
  overlays. One discriminated state makes their mutual exclusion explicit.
- A pure Factory/Mapper translates Copernicus feature-info results into the
  point-detail presentation model, including quality, provenance and no-data
  states.
- React lazy boundaries defer React DayPicker and Leaflet Draw until the user
  opens the calendar or activates a drawing command.

These are small functional abstractions rather than framework layers. The demo
keeps React state local and introduces a new port only for a real external
boundary.

See [Architecture](docs/architecture.md),
[architecture decision record](docs/adr/0001-demo-architecture.md) and the
[original architecture review](docs/architecture-review.md) for additional
context.

## Technology stack

| Area | Technology |
|---|---|
| Application | React 18, TypeScript, Vite |
| Mapping | Leaflet, React Leaflet, Leaflet Draw |
| Satellite data | Copernicus Data Space Ecosystem, Sentinel Hub WMS/WFS |
| Interface | Tailwind CSS, shadcn conventions, Radix Slot, Lucide icons |
| Dates | React DayPicker, date-fns |
| Testing | Vitest, Testing Library, jsdom, V8 coverage |
| Hosting | Vercel |

## Local development

### Prerequisites

- Node.js `20.19` or newer, or `22.12` or newer
- npm

### Installation

```bash
git clone https://github.com/ArkVault/oracular-v2.git
cd oracular-v2
npm install
cp .env.example .env.local
npm run dev
```

Vite prints the local URL when the development server starts. The default is
usually `http://127.0.0.1:5173` or `http://localhost:5173`.

The application includes public demo endpoints, so local startup does not
require private credentials. Values prefixed with `VITE_` are embedded in the
browser bundle and must never contain secrets.

### Public configuration

| Variable | Purpose |
|---|---|
| `VITE_COPERNICUS_WMS_URL` | Public Sentinel Hub WMS instance endpoint |
| `VITE_NOMINATIM_URL` | Place-search endpoint |
| `VITE_BASEMAP_TILE_URL` | Leaflet basemap tile template |

Custom provider domains must also be added explicitly to the Content Security
Policy in `vercel.json` before deployment.

The remaining variables in `.env.example` belong to legacy local tooling and
are not required by the browser application.

## Quality and testing

Run the complete local gate before opening or updating a pull request:

```bash
npm run check
```

The command executes linting, TypeScript validation, the coverage suite and a
production build. The latest verified local checkpoint contains 16 test suites
and 70 tests. Coverage for the configured critical modules is 97.32 percent
statements, 92.02 percent branches, 97.77 percent functions and 98.09 percent
lines.

Coverage thresholds currently apply to the configured domain and provider
modules, not to the entire frontend. The localhost smoke test runs separately
and requires a running application. Browser E2E coverage is still pending.

Individual commands:

| Command | Purpose |
|---|---|
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Validate application TypeScript |
| `npm test` | Run the Vitest suite |
| `npm run test:coverage` | Run tests with coverage thresholds |
| `npm run test:integration` | Run map integration tests |
| `npm run test:smoke` | Verify a running localhost instance |
| `npm run build` | Create the production bundle in `dist` |

Detailed strategy and results are available in
[Test strategy](docs/test-strategy.md) and
[Test checkpoint](docs/test-checkpoint.md).

### Bundle strategy

The production build uses feature-level lazy boundaries for optional tooling.
The verified main JavaScript bundle decreased from 481.23 kB (144.67 kB gzip)
to 364.85 kB (116.89 kB gzip), a reduction of 24.18 percent uncompressed and
19.20 percent gzip. The calendar is emitted as a 72.76 kB chunk (19.28 kB gzip),
while drawing is emitted as a 67.77 kB chunk (14.55 kB gzip) plus its deferred
CSS. File hashes vary between builds; these measurements are a local baseline,
not a permanent performance budget.

## Deployment

The repository includes hardened Vercel configuration but intentionally excludes
the Vercel CLI from the dependency tree. Deploy through Vercel's Git integration:

1. Connect `ArkVault/oracular-v2` to a Vercel project.
2. Configure `main` as the production branch.
3. Use `development` and pull requests for Preview deployments.
4. Store private values only in Vercel's server-side environment configuration.

Preview validation and production readiness are separate release gates. A
successful local build does not by itself establish that OAuth, provider
configuration or public deployment behavior is production-ready.

## Current limitations

- Google authentication has not yet been implemented.
- The current Copernicus configuration may return rendered channels instead of
  scalar scientific measurements for some parameters.
- Color-based estimates depend on rendered imagery and should be treated as
  approximate.
- Drawing is available, but the current KML export remains a placeholder and is
  not suitable for operational use.
- Automated end-to-end coverage against live map providers is still pending.
- Production observability and server-side provider rate limiting require further
  hardening.

## Roadmap

The next planned product slices are:

1. Complete scalar scientific analysis through a validated Copernicus output or
   Statistical API integration.
2. Add Google authentication behind a typed authentication contract.
3. Extend acquisition selection with stable scene identity and richer metadata.
4. Add end-to-end coverage for authentication, calendar and point analysis.
5. Establish verified Vercel Preview and controlled production release gates.

The detailed sequence and acceptance criteria are maintained in the
[Product roadmap](docs/product-roadmap.md).

## Security

- Do not commit `.env`, tokens, provider credentials, private keys or Vercel
  state.
- Never place secrets in `VITE_` variables; Vite exposes them to the client.
- Keep OAuth exchanges and privileged provider calls in managed server-side
  infrastructure.
- Keep only public provider endpoints in browser configuration and require HTTPS
  outside localhost.
- Run the pinned CI, CodeQL, secret scan and production dependency audit before
  merging to protected branches.
- Review `.gitignore` and the staged diff before every publication.

## Contributing

Keep changes scoped and preserve the distinction between rendered imagery,
estimated values and scientifically validated measurements. New provider logic
should be introduced behind a small typed port and accompanied by unit or
integration tests.

Before submitting a change:

```bash
npm install
npm run check
```

Open a focused pull request describing the behavior changed, the validation
performed and any remaining scientific or deployment limitations.

Copyright 2025 Oracular V2. All rights reserved.
