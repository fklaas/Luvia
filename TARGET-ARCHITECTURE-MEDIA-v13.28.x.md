# Zielarchitektur Media 13.28.x

```text
UI / Galerie / Live Moment / Timeline / Reisebuch
                    ↓
              öffentliche Media API
                    ↓
        Media Service + Upload Coordinator
                    ↓
 Metadata / Evidence / Place Link / Moment Link
                    ↓
       Supabase Database + privater Storage
```

## Contracts

- `MediaEntity`: stabile ID, Trip, Urheber, Typ, Status, Hash, Original/Preview, Aufnahmezeit, GPS, Metadaten.
- `MediaPlaceLink`: `media_id` → kanonische `places.id`, Evidenz und Confidence.
- `LiveMomentMediaLink`: n:m zwischen Reiseereignis und Media.
- `MediaEvidence`: kleine, task-spezifische Metadaten; keine vollständigen Binärbilder oder Journey-Graphs in AI-Payloads.
- Uploads sind idempotent, dedupliziert, offline-fähig und nach Reise/Nutzer berechtigt.
