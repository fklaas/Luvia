# Release 13.28.0 – Smart Photo Foundation

## Version

- App: `13.28.0`
- Core: `4.28.0`
- Service Worker: `luvia-shell-v13.28.0`

## Neu

- kanonischer `LuviaMediaCore`
- private Storage-Struktur `luvia-media`
- zentrale Foto-Metadaten in `public.media`
- JPEG-EXIF-Grundlage für Aufnahmezeit und GPS
- Bildabmessungen, Dateigröße, Zeitzone und Content-Hash
- reisebezogene Deduplizierung
- `media_place_links` für kanonische Place-Verknüpfungen
- `live_moment_media` für null bis viele Fotos pro Live Moment
- Realtime-Abonnement auf `public.media`
- Developer-Console-Service `media-core`
- Media-Readiness-Diagnose für die neue Grundlage

## Kompatibilität

Neue Galerie-Uploads werden über `media/luvia-media` geschrieben. Alte `gallery_photos/paris-gallery`-Fotos bleiben lesbar und bearbeitbar. Es wurde kein automatisches Löschen oder Verschieben alter Dateien eingebaut.

## Wichtige Grenze

Die Migration wurde lokal statisch geprüft, aber nicht gegen die produktive Supabase-Datenbank ausgeführt. Erst `supabase db push` und die anschließenden Live-Tests bestätigen Tabellen, Policies und Storage-Bucket produktiv.
