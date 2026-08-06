# Deployment Luvia 11.2.4

## 1. Supabase zuerst
Im Supabase SQL Editor den vollständigen Inhalt von
`supabase/migrations/20260727_004_core_v3_0_2_4_trip_destination_cloud_hydration.sql` ausführen.

Die Migration erweitert `trip_settings`, erneuert `paris_list_my_trips()` und stellt `luvia_update_trip_details(...)` bereit. Die neuen Funktionen sind ausschließlich für `authenticated` freigegeben.

## 2. App deployen
Danach den Inhalt des Ordners `Luvia` vollständig in das GitHub-Repository übernehmen und pushen. Cloudflare Pages baut anschließend wie bisher.

## 3. PWA aktualisieren
Nach erfolgreichem Deployment die App einmal vollständig schließen und erneut öffnen. Bei hartnäckigem Altstand Website-Daten/Service-Worker einmal löschen. Der neue Cache heißt `luvia-shell-v11.2.4`.

## 4. Supabase Anonymous Auth
Nach erfolgreichem Regressionstest kann in Supabase unter Authentication → Providers die anonyme Anmeldung deaktiviert werden. Im Produktcode existiert kein `signInAnonymously()`-Aufruf mehr. Bestehende anonyme Benutzer sollten vor dem endgültigen Abschalten bei Bedarf in reguläre Konten überführt werden.
