# Luvia Build 13.4.0 – Place Experience Core Consolidation

Core 4.4.0 consolidates the Restaurant reference implementation into reusable Place Experience services.

## Architecture

- `LuviaPlaceDetail` is the single overlay, progressive-loading and detail-rendering contract.
- Restaurants and accommodations now enter through the same loading overlay.
- `LuviaPlaceIntelligence` is the universal facade for recommendations, schedule, timeline, today, visit and live-day context.
- Distance has one source of truth: the current GPS location. Destination-derived distances are no longer used by Place cards or detail experiences.
- Type adapters retain only meaningful capabilities. Restaurants keep reservation and day planning; accommodations expose stay and booking fields.

## Accommodation experience

- The detail experience opens immediately with the same loading state as Restaurants.
- Provider details, photos and GPS route are loaded in parallel.
- Check-in, check-out, guests, rooms, booking number, booking provider, trip base and notes are always visible.
- Saving a stay automatically imports the canonical Place when it has not yet been saved.
- Preview-card distance is hydrated from the same GPS route used by the detail experience.

## Database

Migration `20260729_030_core_v4_4_0_place_experience_consolidation.sql` normalizes the universal `trip_places` lifecycle constraint and adds trip/type/status and favorite indexes.

## Compatibility

Restaurant-specific intelligence remains available as a compatibility adapter behind `LuviaPlaceIntelligence`. Existing Restaurant workflows and provider actions remain intact.
