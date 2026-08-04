# Luvia 13.28.0 – Smart Photo Foundation

## Ziel

13.28.0 ersetzt neue Galerie-Uploads durch einen kanonischen Media-Pfad. Bestehende `gallery_photos`-Datensätze und der Bucket `paris-gallery` bleiben ausschließlich als lesbarer Kompatibilitätspfad erhalten, bis ein verifizierter Daten-Cutover durchgeführt wurde.

## Datenfluss

```text
Galerie / Live Moment / Place / spätere Reisebuch-UI
                    ↓
              window.LuviaMediaCore
                    ↓
      Metadaten, Deduplizierung, Berechtigungen
                    ↓
        public.media + private luvia-media
                    ↓
 media_place_links / live_moment_media / Realtime
```

## Kanonische Identitäten

- Media: `public.media.id`
- Reise: `public.media.trip_id`
- Urheber: `public.media.user_id`
- Place: `public.places.id` über `media.place_id` und `media_place_links`
- Live Moment: bestehender `moment_key` plus n:m-Tabelle `live_moment_media`
- `place_visits` bleibt unverändert und verwendet weiterhin `place_id`; kein `trip_place_id` wird vorausgesetzt.

## Storage

- Bucket: `luvia-media`
- Sichtbarkeit: privat
- Pfad: `{trip_id}/{user_id}/{media_id}/original.{ext}`
- Größenlimit: 25 MiB
- Bildtypen: JPEG, PNG, WebP, HEIC, HEIF, AVIF
- Lesen, Schreiben und Löschen sind auf Mitglieder der Reise begrenzt.

## Metadaten

Der Browser extrahiert, soweit verfügbar:

- `captured_at`
- Reisetag `day_key`
- Zeitzone
- JPEG EXIF `DateTimeOriginal`
- JPEG GPS-Koordinaten
- Breite und Höhe
- Dateigröße
- SHA-256-basierter Inhaltsfingerabdruck

Bei Formaten ohne lesbare EXIF-Daten wird `File.lastModified` als nachvollziehbare Ersatz-Evidence verwendet. HEIC/HEIF werden gespeichert; Browser können deren EXIF-Daten nicht in jeder Umgebung lokal auslesen.

## Deduplizierung

Ein partieller Unique-Index verhindert innerhalb einer Reise mehrere aktive Media-Datensätze mit demselben `content_hash`. Gelöschte Datensätze blockieren spätere erneute Uploads nicht.

## Legacy-Kompatibilität

`sync/gallery.js` schreibt neue Fotos nur noch über `LuviaMediaCore` in `media/luvia-media`. Beim Lesen werden zusätzlich alte `gallery_photos/paris-gallery`-Einträge eingeblendet. Die lokale IndexedDB bleibt eine Offline- und Rendering-Kopie, nicht die fachlich führende Cloud-Datenquelle.

## Noch nicht Bestandteil

- serverseitige Thumbnail-/Preview-Pipeline
- automatische Clusterbildung
- automatische Place-Erkennung
- KI-Bildanalyse
- vollständige Migration alter `gallery_photos`
- automatische Album- und Story-Erstellung
