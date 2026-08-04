# Luvia 13.27.5 – Media & Diagnostics Readiness

## Ergebnis

**Readiness-Gate: READY WITH MIGRATION.** Der bestehende Code enthält eine zentrale `media`- und `media_pages`-Grundlage, verwendet produktiv für Fotos aber weiterhin den älteren Pfad `gallery_photos` + Supabase Storage Bucket `paris-gallery`. Live Moments laufen über `live_moment_status` und können nur eine einzelne `linked_photo_id` halten. 13.28.0 darf beginnen, muss jedoch zuerst das produktive Schema und die Storage-Policies live verifizieren und eine kontrollierte Migration auf eine zentrale Media-Entity einführen.

## Auditumfang

- 1.382 Dateien der gelieferten Projekt-ZIP inventarisiert und geprüft; im Arbeitslauf erzeugte Auditdateien sind davon getrennt.
- 201 JavaScript-Dateien, 55 SQL-Dateien, 56 rekonstruierte Tabellenmodelle und 113 Policy-Definitionen statisch ausgewertet.
- Vollständiger vorheriger Chatverlauf und alle bereitgestellten Luvia-Roadmap-/Architekturdokumente wurden als Entscheidungsgrundlage gelesen.
- Keine produktiven Supabase-, Browser-, PWA-, Mobile- oder Storage-Schreibtests behauptet.

## Kernbefunde

1. `media`/`media_pages` sind im Foundation-Schema vorhanden, besitzen im aktuellen Frontend aber keinen produktiven Upload-/Reader-Pfad.
2. `sync/gallery.js` ist der aktive Cloud-Fotopfad: Bucket `paris-gallery`, Tabelle `gallery_photos`, Pfad `${tripId}/${photoId}.<ext>`.
3. Die Definitionen von `gallery_photos`, `live_moment_status` und `live_moments` fehlen im gelieferten Migrationsbestand. Sie werden von Code und späteren Reparaturmigrationen vorausgesetzt. Das produktive Schema ist deshalb live zu verifizieren.
4. `gallery.js` speichert zusätzlich Blobs in IndexedDB `paris-reisegalerie`; Notizen liegen in Local Storage. Das ist eine parallele lokale Fachpersistenz.
5. Live Moments sind Statusdatensätze und keine zentrale Event-Entity mit n:m Media-Verknüpfung.
6. Der Place Core ist kanonisch auf `places.id` aufgebaut. `trip_places` verknüpft einen Place mit einer Reise. `place_visits` referenziert im bekannten produktiven Schema `place_id`, nicht `trip_place_id`.
7. Die Developer Console war cache-/versionsseitig auf 13.20.0 stehen geblieben. Dies wurde in 13.27.5 korrigiert.
8. Der neue Service `media-readiness` ist read-only, liefert das vereinheitlichte Diagnoseformat und prüft vorhandene APIs sowie – bei initialisiertem Client – Tabellen und Bucket ohne Writes.

## Verbindliche Zielentscheidung

- **Foto:** zentrale `media`-Entity.
- **Reisebezug:** `media.trip_id`.
- **Urheber:** `media.user_id` beziehungsweise ein eindeutig dokumentierter Participant-Bezug.
- **Place-Bezug:** kanonisch `places.id`; reisespezifischer Kontext optional zusätzlich über `trip_places.id`, aber niemals als Ersatz für die kanonische Place-ID.
- **Live Moment:** eigene Reiseereignis-Entity mit null bis vielen Media-Referenzen über eine Join-Tabelle.
- **Storage:** privater, reiseisolierter Bucket mit RLS/Storage-Policies und signierten URLs; endgültiger Bucketname erst nach Live-Inventur.
