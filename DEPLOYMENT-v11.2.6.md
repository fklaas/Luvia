# Deployment · Luvia 11.2.6

1. Vollständiges Projektpaket in das GitHub-Repository übernehmen.
2. Commit und Push durchführen.
3. Supabase Edge Function aus dem Projektordner neu deployen:
   `supabase functions deploy luvia-gateway --project-ref yiadkcxgyzdgyadnhyqe`
4. Cloudflare Pages Deployment abwarten.
5. Browser/PWA vollständig neu laden. Bei weiterhin altem Stand Service Worker und Website-Daten einmal entfernen.
6. Developer Console, Backend Console und Diagnose-Seite öffnen. Alle müssen Build 11.2.6 / Core 3.0.2.6 anzeigen.
7. Neue Reise erstellen und `Paris` eingeben. Vorschläge müssen erscheinen.

Keine neue SQL-Migration erforderlich. Die Migration aus 11.2.4 bleibt Voraussetzung.
