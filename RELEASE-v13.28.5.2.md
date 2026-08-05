# Luvia 13.28.5.2 – Correction Build

## Fokus
- EXIF/GPS-Stabilisierung für Uploads und App-Kamera
- AI Memory Bridge repariert und mit Ziel-/Ort-Fallback erweitert
- globaler Standort-Prompt beim ersten aktiven App-Start
- Photo Studio ohne ungewollte Sticker-Geister
- Signed-URL-Fallback für fehlende Preview-Dateien
- Realtime-/Galerie-Fehlerrauschen reduziert

## Wichtige Änderungen
- `core/media/media-core.js`
  - Signed URLs fallen nun sauber von Preview auf Original zurück.
  - App-Kamera wird als eigener Source-Typ gespeichert.
- `core/media/media-metadata.js`
  - robustere EXIF-Auswertung für JPEGs inkl. Datums-/GPS-Fallbacks.
- `core/media/ai-memory-bridge.js`
  - Place-Vorschläge nutzen nun auch das Reiseziel als groben Fallback.
- `core/location/global-location-bootstrap.js`
  - fragt den Standort einmal global an und aktiviert danach das Presence-Tracking.
- `app/gallery-view.js`
  - Sticker nur noch als echte Overlays.
  - fehlende Signed URLs werden gecacht statt wiederholt angefragt.
  - Kamera-Uploads reichen die Standortdaten sauber durch.
  - Realtime-Reloads hören nur noch auf Media-Tabellen.
- `intelligence/console.html`
  - lädt jetzt auch `media-clustering` und `ai-memory-bridge` für korrekte Diagnostics.
