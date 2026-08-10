# Oracular V2

Oracular V2 is a browser-based geospatial analysis demo for exploring Copernicus
imagery and environmental screening indicators without requiring a desktop GIS.
The application combines an interactive Leaflet map, Sentinel Hub WMS layers,
acquisition-date discovery, traceable evalscripts and point-level analysis in a
responsive guided interface.

The repository currently represents a technical demo. It is suitable for
product validation and controlled testing, but it should not yet be treated as
a production scientific system.

## Current capabilities

- Interactive satellite basemap built with Leaflet and React Leaflet, starting
  at Ciudad del Carmen, Mexico.
- Copernicus Sentinel-2 visualization for natural color, qualitative
  chlorophyll-a, CDOM, turbidity, total suspended solids and forest-fire layers.
- Sentinel-1 SAR screening views for contextual marine oil-like dark anomalies
  and positive-contrast Sargassum candidates.
- Place search through a typed Nominatim adapter.
- A dismissible workflow guide covering place search, acquisition date,
  indicator selection and readiness.
- Single-month acquisition calendar populated from Copernicus metadata, with
  available imagery dates highlighted.
- Strict cloud-coverage filtering: only acquisitions below 10 percent are
  considered eligible for Sentinel-2 views.
- The actual image acquisition timestamp is displayed in every parameter view,
  including Natural Color.
- Point selection with coordinates, acquisition metadata, cloud coverage and
  provider result state in the right-side panel.
- Parameter-specific legends, scientific citations and explicit implementation
  limitations in the right-side panel.
- Versioned WMS evalscripts for CDOM, turbidity, total suspended solids,
  Sentinel-1 VV/VH source encoding and Sargassum screening under
  `sentinel-hub/evalscripts/`. Oil-spill candidates are classified from the
  encoded SAR source by a buffered client-side CFAR processor.
- A latest-request-wins WMS policy that discards superseded indicator loads,
  avoids offscreen analysis buffering and reveals a mosaic only when its current
  tile grid is complete.
- Unrestricted indicator access during the current testing phase.
- A blocking loader tied to the real WMS loading lifecycle rather than a fixed
  visual delay.
- Explicit out-of-area and no-data states when a point cannot be evaluated.
- Polygon and rectangle drawing controls for defining an area of interest.
- Responsive glass-panel interface for desktop and narrow viewports.
- Local quality gate covering lint, TypeScript, automated tests, coverage and
  production build.

## How the demo works

1. The guide starts with place search or direct navigation on the map.
2. The Dates control requests acquisitions for the current bounds and sensor,
   then highlights the available dates for one month at a time.
3. Selecting a date updates the WMS time range and acquisition badge.
4. Selecting an indicator mounts only the newest requested WMS mosaic. The
   workspace remains blocked until Leaflet confirms that all current tiles have
   loaded, preventing partial or stale overlays.
5. Clicking the map requests feature information for the selected parameter and
   displays the result, provenance and quality state in the analysis panel.

## Scientific interpretation

Oracular V2 distinguishes between scalar measurements and rendered image channels.
If Copernicus returns a scalar value, the application can present it with the
configured unit and quality range. If the provider returns only RGB or rendered
channels, Oracular V2 does not label those channels as a scientific measurement.

Oracular V2 does not invert rendered RGB channels into a concentration when the
provider's scalar mapping is unavailable. Those views remain qualitative
screening imagery until a versioned analytical output and local validation are
available. They are not a replacement for a validated Copernicus Processing or
Statistical API workflow.

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
sentinel-hub/
  evalscripts/               Versioned per-request WMS visualization scripts
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
| Application | React 19, TypeScript, Vite |
| Mapping | Leaflet, React Leaflet, Leaflet Draw |
| Satellite data | Copernicus Data Space Ecosystem, Sentinel Hub WMS/WFS |
| Interface | Tailwind CSS, shadcn conventions, Radix Slot, Lucide icons |
| Dates | React DayPicker, date-fns |
| Testing | Vitest, Testing Library, jsdom, V8 coverage |
| Hosting | Vercel static hosting |

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

Indicator access is currently unrestricted in local and deployed environments.
The application no longer performs per-IP quota checks or requires a developer
passphrase. Direct public provider tile URLs remain subject to the provider's
own service limits.

The remaining variables in `.env.example` belong to legacy local tooling and
are not required by the browser application.

## Quality and testing

Run the complete local gate before opening or updating a pull request:

```bash
npm run check
```

The command executes linting, TypeScript validation, the coverage suite and a
production build. The latest verified local checkpoint contains 24 test files
and 130 tests. Coverage for the configured modules is 98.67 percent statements,
94.93 percent branches, 100 percent functions and 98.64 percent lines.

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
The latest verified main JavaScript bundle is approximately 483.78 kB
(150.43 kB gzip). Leaflet Draw remains deferred as a separate 67.77 kB chunk
(14.55 kB gzip) plus its CSS. File hashes and exact sizes vary between builds;
these measurements are a local checkpoint, not a permanent performance budget.

## Deployment

The deployment target is Vercel. The versioned `vercel.json` defines the
single-page application fallback and security headers.

1. Import or link `ArkVault/oracular-v2` as a Vercel project.
2. Configure `main` as the production branch and `npm run build` as the build
   command.
3. Publish the generated `dist/` directory.
4. Use `development` and pull requests for Preview deployments, and `main` for production.

Preview validation and production readiness are separate release gates. A
successful local build does not by itself establish that OAuth, provider
configuration or public deployment behavior is production-ready.

## Current limitations

- Google authentication has not yet been implemented.
- The current Copernicus configuration may return rendered channels instead of
  scalar scientific measurements for some parameters.
- Chlorophyll-a uses a versioned Sentinel-2 Ulyssys MCI evalscript with its
  documented −0.005 to 0.05 palette. MCI remains a qualitative spectral index,
  not an mg/m³ concentration; quantitative conversion requires regional in-situ
  calibration.
- The oil-spill view now rejects isolated dark regions with buffered
  edge-connected SAR-water topology and local CFAR contrast, but tile-local
  connectivity is not a global ocean polygon. Guaranteed coast-only topology
  still requires an external water/ocean boundary.
- Drawing is available, but the current KML export remains a placeholder and is
  not suitable for operational use.
- Automated end-to-end coverage against live map providers is still pending.
- Indicator access is unrestricted during testing. Direct public provider tile
  URLs remain subject to provider quotas. Production observability and any
  future authenticated per-user controls require further hardening.

## Roadmap

The next planned product slices are:

1. Complete scalar scientific analysis through a validated Copernicus output or
   Statistical API integration.
2. Add Google authentication behind a typed authentication contract.
3. Extend acquisition selection with stable scene identity and richer metadata.
4. Add automated end-to-end coverage for authentication, calendar, WMS loading
   and point analysis.
5. Establish verified Vercel Preview and controlled production release
   gates.

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
