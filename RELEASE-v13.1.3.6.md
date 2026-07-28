# Luvia 13.1.3.6 – Deterministic Schedule Persistence Fix

- Schedule wird beim Trip-Wechsel synchron aus dem lokalen Snapshot hydriert.
- Supabase `trip_schedule_events` wird direkt über den bestehenden Supabase-Client gelesen und beschrieben; das Gateway bleibt nur Fallback.
- Wiederholte Gateway-400-Schleifen werden vermieden.
- Optimistische Uhrzeitänderungen besitzen Vorrang vor veralteten Restaurant-Snapshots.
- Vorschläge werden zuerst als dauerhafter Schedule-Eintrag angelegt und anschließend mit Restaurantdaten angereichert.
- Einträge bleiben während Remote-Refreshes sichtbar.
