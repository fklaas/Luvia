# Luvia Build 13.2.0 – Universal Place Data Completion

Core 4.2.0 completes the universal cloud-backed Place entity pipeline.

## Delivered
- Restaurant discovery and imports now enter through the universal Place Entity Service.
- All eleven registered Place adapters have a real Google Places provider source and cloud entity loader.
- Generic provider search, canonical import, identity resolution, trip linking, lifecycle update and removal APIs.
- Universal gateway actions: `place.health`, `place.list`, `place.import`, `place.lifecycle.update`, `place.remove`.
- New idempotent Supabase migration with canonical Place RPCs.
- Restaurant-specific reservation data remains an optional extension of a universal Place instead of a separate identity.
- Adapter diagnostics distinguish `ready`, `provider_ready` and `degraded`.
- Place Core hydrates all types and exposes universal search/import/lifecycle APIs.

## Architecture
Provider result → universal normalizer → canonical `places` identity → single `trip_places` relation → optional type extension → Schedule/Today/Timeline/Visits/Recommendations.
