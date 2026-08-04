# Tests 13.28.0

## Lokal bestanden

- JavaScript-Syntax aller geänderten JS-Dateien
- JSON-Validierung aller JSON-Dateien
- lokale Script-, CSS- und Assetreferenzen der aktiven HTML-Dateien
- Versionskonsistenz App/Core/Service Worker/Force Update
- gezielter Test `media-smart-photo-foundation-v13.28.0.test.cjs`
- Media-Core-Registrierung und Diagnose-Ladefolge
- Migration enthält kanonische Place-Verknüpfung und kein `trip_place_id`
- ZIP-Integritätsprüfung

## Gesamte vorhandene CJS-Suite

- 52 Tests ausgeführt
- 35 bestanden
- 17 fehlgeschlagen

Die verbleibenden Fehler betreffen bereits veraltete Planning-, Place-Hub- und frühere UI-Erwartungen. Die drei aktuellen Versions-/Diagnosetests wurden auf eine versionsrobuste Prüfung aktualisiert. Der neue Media-Test besteht.

## Nicht lokal/live geprüft

- tatsächliche Ausführung von `supabase db push`
- produktive RLS-Auswertung
- produktive Storage-Policies
- echter Upload und Download
- HEIC/HEIF-Verhalten auf iOS
- Multi-User-Realtime
- PWA- und Mobile-Browser-Verhalten
- produktive Migration bestehender `gallery_photos`
