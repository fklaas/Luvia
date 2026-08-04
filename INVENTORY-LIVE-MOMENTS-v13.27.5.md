# Live-Moment-Inventar 13.27.5

## Aktiver Pfad

`sync/live-moments.js` schreibt `live_moment_status` per Upsert auf dem Konfliktschlüssel `trip_id,moment_key`. Gespeichert werden Trigger-, Seen- und Collected-Zeitpunkte samt Benutzerreferenzen, Favoritenstatus und genau eine `linked_photo_id`. Realtime wird pro Reise auf derselben Tabelle abonniert.

## Parallelpfade

- `live-moments.js`: feste Paris-Momentdefinitionen und UI-Zustand.
- `modules/liveMoments.js`: Moduloberfläche.
- `smart-photo-moments.js`: lokaler experimenteller Foto-/Momentpfad.
- `live_moments`: wird von Profil-/Management-Code gezählt, aber seine Tabellendefinition fehlt im Paket.

## Bewertung

- mehrere Bilder pro Moment: **nein**, aktuell maximal eine `linked_photo_id`.
- tatsächliche Aufnahmezeit/GPS: nicht im Live-Moment-Statusmodell.
- Place-/Timeline-Verknüpfung: nicht kanonisch vorhanden.
- Realtime: vorhanden für `live_moment_status`.
- Ziel: Live Moment als Reiseereignis; n:m-Verknüpfung zu `media` über eigene Join-Tabelle.
