# ADR 0001: Lightweight feature-first architecture

- Status: Accepted
- Date: 2026-08-06

## Context

Oracular V2 is currently a working demo, but planned authentication, acquisition
catalog and scientific-analysis capabilities will add providers and state. The
original map component owned UI, provider calls, configuration and mapping.

## Decision

Use feature folders and small Ports & Adapters boundaries for external systems.
Select concrete adapters in one composition root and keep presentation state
local. Do not introduce global state, microservices, CQRS or a complete Clean
Architecture layer stack until demonstrated complexity requires them.

## Consequences

- Provider behavior can be tested without rendering the map.
- UI code depends on stable contracts rather than Copernicus/Nominatim DTOs.
- Some coordination remains in `Map`; it will be extracted opportunistically.
- A future server boundary is explicit but is not required for the current demo.
