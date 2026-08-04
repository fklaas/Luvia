# Migrationsplan Media – Vorbereitung 13.28.0

## Vorbedingung: Live-Inventur

1. `information_schema.columns`, Constraints und RLS für `media`, `media_pages`, `gallery_photos`, `live_moment_status`, `live_moments` exportieren.
2. Bucket `paris-gallery` inklusive Public-Flag, Limits, Allowed MIME Types und `storage.objects`-Policies prüfen.
3. Anzahl und Pfade verwaister Dateien ermitteln.
4. Unique-Constraint `live_moment_status(trip_id,moment_key)` verifizieren.

## Geplante Migration 13.28.0

- zentrale Media-Metadaten um Aufnahmezeit, Koordinaten, Zeitzone, Hash, Größe, Dimensionen, Uploadstatus und optionalen kanonischen `place_id` ergänzen;
- privaten kanonischen Bucket und reiseisolierte Storage-Policies definieren;
- Join-Tabelle `live_moment_media` oder gleichwertigen zentralen Contract für n:m-Beziehungen einführen;
- vorhandene `gallery_photos` schrittweise in `media` spiegeln und erst nach verifiziertem Cutover archivieren;
- keine Annahme nicht vorhandener Spalten oder Konfliktconstraints.

## Deploymententscheidung 13.27.5

Keine Datenbankmigration und keine Edge-Function-Änderung. Nur Frontend/Diagnose/Dokumentation.
