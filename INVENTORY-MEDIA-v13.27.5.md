# Media-Inventar 13.27.5

| Tabelle/Pfad | Status | Felder/Modell | Quelle |
| --- | --- | --- | --- |
| media | Migration definiert | id, trip_id, user_id, module_key, entity_type, entity_id, type, purpose, source, original_name, mime_type, storage_path, remote_url, page_count, status, metadata, created_at, updated_at | supabase/migrations/20260726_001_intelligence_core_v2_1.sql |
| media_pages | Migration definiert | id, media_id, page_number, preview_path, width, height, metadata, created_at | supabase/migrations/20260726_001_intelligence_core_v2_1.sql |
| gallery_photos | nur im Code/Setup referenziert | nicht rekonstruierbar | keine Definition im Paket |
| live_moment_status | nur im Code/Setup referenziert | nicht rekonstruierbar | keine Definition im Paket |
| live_moments | nur im Code/Setup referenziert | nicht rekonstruierbar | keine Definition im Paket |
| day_closures | nur im Code/Setup referenziert | shared_note, favorite_photo_id, day_rating, food_rating, field_meta | keine Definition im Paket |
| timeline_events | Migration definiert | id, trip_id, place_id, participant_id, event_type, title, description, occurred_at, source, is_automatic, metadata, created_at, updated_at | supabase/migrations/20260728_020_core_v4_0_2_timeline_gps_visit_detection.sql |
| place_visits | Migration definiert | id | supabase/migrations/20260728_019_core_v4_0_0_place_intelligence_foundation.sql |
| places | Migration definiert | id, provider, provider_place_id, name, address, latitude, longitude, maps_url, website, phone, rating, rating_count, price_level, categories, attributes, opening_hours, raw_provider_data, source_updated_at, created_at, u | supabase/migrations/20260726_001_intelligence_core_v2_1.sql |
| trip_places | Migration definiert | planned_date, planned_time, id, trip_id, place_id, module_key, status, position, is_favorite, user_notes, custom_name, custom_description, custom_symbol, created_by, sync_status, created_at, updated_at, lifecycle_status, | supabase/migrations/20260726_001_intelligence_core_v2_1.sql |

## Writer und Reader

| Pfad | Writer | Reader | Autoritativ | Entscheidung |
| --- | --- | --- | --- | --- |
| `sync/gallery.js` | Upload nach `paris-gallery`, Upsert `gallery_photos` | Galerie, Day Closure, Profilzähler | aktuell produktiver Fotopfad | in 13.28.0 migrieren |
| `gallery.js` | IndexedDB `paris-reisegalerie`, Local Storage Notizen | Galerie-UI | lokaler Legacy-Cache/Fachpfad | Import prüfen, danach nur Cache |
| `media` | aktuell kein produktiver Foto-Writer gefunden | kein produktiver Galerie-Reader gefunden | Zielmodell/Fundament | erweitern und produktiv aktivieren |
| `media_pages` | kein Writer gefunden | kein Reader gefunden | geplant | für Vorschauen/Dokumentseiten prüfen |
| `sync/live-moments.js` | `live_moment_status` | Live-Moment-UI, Day Closure | aktiver Statuspfad | auf Event + Media-Join migrieren |
