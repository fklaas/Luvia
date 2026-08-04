# Storage-Inventar 13.27.5

| Bucket/Pfad | Öffentlich/privat | Uploader | Leser | Löscher | Signierte URLs | Policies im Paket | Status | Zielentscheidung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `paris-gallery/{trip_id}/{photo_id}.{ext}` | im Code nicht feststellbar | `sync/gallery.js` | `sync/gallery.js` via `download()` | `sync/gallery.js` | nein | keine Bucket-/Object-Policy-Definition gefunden | aktiv, Legacy | live prüfen und kontrolliert migrieren |
| `media.storage_path` | nicht implementiert | kein produktiver Writer | kein produktiver Reader | keiner | nicht implementiert | Tabellen-RLS vorhanden, Storage nicht | Fundament | privaten kanonischen Media-Bucket in 13.28.0 definieren |
| IndexedDB `paris-reisegalerie/photos` | lokal | `gallery.js` | `gallery.js` | `gallery.js` | entfällt | Browserlokal | aktiv/Legacy | nur temporärer Cache nach Migration |
| IndexedDB `paris-smart-photo-moments` | lokal | `smart-photo-moments.js` | gleicher Legacy-Pfad | gleicher Legacy-Pfad | entfällt | Browserlokal | experimentell | Datenimport prüfen, nicht weiter ausbauen |

## Kritische Lücke

Im Paket existiert keine belastbare Definition des Buckets `paris-gallery`, seiner Öffentlichkeit, Größenlimits, MIME-Regeln oder Storage-Policies. Verwaiste Dateien können daher statisch nicht sicher ermittelt werden. Vor 13.28.0 ist ein Live-Schema-/Storage-Export erforderlich.
