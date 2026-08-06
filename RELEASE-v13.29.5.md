# Luvia 13.29.5 / Core 4.29.5

## Gallery Stabilization & Direct Thumbnail Delivery

- Gallery Store loads one canonical bootstrap snapshot per trip.
- Removed gallery realtime subscriptions and all full-view remounts triggered by media/cluster events.
- Gallery components render only from the shared snapshot and perform no own cluster or album queries.
- Cards use only direct public `thumb-256.webp` / `thumb-640.webp` URLs.
- Removed `preview.jpg` fallback, Blob hydration and browser thumbnail backfill from card rendering.
- Existing photos without a valid public thumbnail show a neutral skeleton instead of downloading a large preview.
- Real-photo overlays such as “Euer Reisemoment” are removed after load and are never rendered over actual images.
- Day folders with photos now use an actual `<img>` cover; empty days keep the warm travel placeholder.
- Duplicate cluster memberships are deduplicated non-destructively in the canonical Gallery Store.
- Added public EXIF-free thumbnail bucket and server-side backfill Edge Function.
- Added diagnostics for mount count, bootstrap count and current snapshot.
