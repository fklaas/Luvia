# Deployment Luvia 11.6.0

1. Vollständige ZIP in das lokale Repository übernehmen.
2. Supabase SQL Editor öffnen.
3. `supabase/migrations/20260727_011_core_v3_4_0_connected_join_foundation.sql` vollständig ausführen.
4. Prüfen, dass `trip_members` in der Realtime-Publication enthalten ist.
5. Committen und pushen.
6. Cloudflare-Deployment abwarten.
7. PWA schließen und neu öffnen; bei altem Cache Website-Daten löschen.
8. Developer Console prüfen: Build 11.6.0, Core 3.4.0.

Kein Edge-Function-Deployment erforderlich.
