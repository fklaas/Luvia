# Deployment 13.28.0

## 1. Datenbank und Storage

Im Supabase-Projektordner ausführen:

```bash
supabase db push
```

Dabei muss die Migration ausgeführt werden:

```text
20260804232500_media_smart_photo_foundation.sql
```

Anschließend in Supabase kontrollieren:

- `media` enthält die neuen Metadatenfelder
- `media_place_links` existiert
- `live_moment_media` existiert
- Bucket `luvia-media` ist privat
- Größenlimit: 25 MiB
- Storage-Policies `luvia_media_objects_*` existieren
- Realtime enthält `media` und `live_moment_media`

## 2. Frontend

```bash
git add .
git commit -m "feat: add smart photo foundation with canonical media core"
git push
```

## 3. App aktualisieren

1. alle Luvia-Tabs schließen
2. installierte PWA vollständig beenden
3. `force-update.html` öffnen
4. Update ausführen
5. App neu starten
6. App `13.28.0` und Core `4.28.0` kontrollieren

## 4. Live-Tests

- Developer Console → `media-core` testen
- Developer Console → `media-readiness` testen
- ein kleines JPEG hochladen
- Reload durchführen
- zweites Mitglied öffnet dieselbe Reise
- Aufnahmezeit und Reisetag prüfen
- identisches Foto erneut hochladen und Deduplizierung prüfen
- Foto löschen und Reload prüfen
- altes Foto aus `paris-gallery` auf Lesbarkeit prüfen

## Nicht erforderlich

Keine Edge Function wurde geändert. Nicht ausführen:

```bash
supabase functions deploy luvia-gateway
supabase functions deploy luvia-intelligence
```

Keine Secrets wurden geändert.
