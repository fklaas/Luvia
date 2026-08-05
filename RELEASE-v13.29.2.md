# Luvia 13.29.2 / Core 4.29.2

## Instant Media Cache & Cluster Data Integrity

- Stable Cache-Storage keys per media id and render version.
- Previously viewed previews are returned from local Cache Storage without requesting a new signed URL.
- Visible cluster previews are prewarmed after the compact gallery data load.
- Media and cluster data reads are promise-deduplicated and time-bounded cached.
- Gallery startup requests run in parallel; automatic EXIF/place reanalysis no longer runs while opening the gallery.
- Cluster cards bind all controls before image hydration.
- Cluster preview ids, cover id and photo count are persisted and maintained by a database trigger.
- Existing clusters are backfilled by the migration.
- Service worker shell version and visible application/core versions are aligned.
