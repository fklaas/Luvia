# Deployment Luvia 11.6.1

1. Vollständige ZIP entpacken.
2. Inhalt aus `luvia-main` in das lokale Repository kopieren und überschreiben.
3. Supabase SQL Editor öffnen.
4. Migration `supabase/migrations/20260727_012_core_v3_4_1_join_schema_compatibility.sql` vollständig ausführen.
5. Änderungen committen und pushen.
6. Cloudflare-Deployment abwarten.
7. PWA beziehungsweise Browser-Tab vollständig schließen und neu öffnen.
8. Bei altem Stand Website-Daten löschen oder PWA neu installieren.
9. Developer Console prüfen: Build 11.6.1, Core 3.4.1.

Kein Deployment der Edge Function `luvia-gateway` erforderlich.
