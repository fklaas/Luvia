# Luvia 13.29.3.1 / Core 4.29.3.1

## Gallery Clear Deployment Integrity

- Alle App- und Service-Worker-Cache-Buster auf 13.29.3.1 angehoben.
- Galerie-Leeren-Button wird zuverlässig aus der aktuellen Gallery-Datei geladen.
- Löschroutine verwendet nur Tabellen des tatsächlich deployten Schemas.
- Optionale, nicht vorhandene Relationen `media_place_links` und `live_moment_media` werden nicht mehr abgefragt.
- Timeline-Polaroids werden über `timeline_events`, `media_day_polaroids` und `live_moment_status.linked_photo_id` bereinigt.
- Media-Readiness-Diagnostik erzeugt keine Startfehler mehr durch optionale Tabellen.
