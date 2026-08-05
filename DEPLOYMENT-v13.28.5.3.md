# Deployment 13.28.5.3

1. Vollständigen Inhalt der Projekt-ZIP in das GitHub-Repository übernehmen.
2. Commit und Push ausführen.
3. Cloudflare Pages Build abwarten.
4. Auf dem iPhone die App beziehungsweise Safari vollständig schließen und neu öffnen.
5. Falls noch alte Assets geladen werden: `https://myluvia.app/force-update.html` öffnen und anschließend Luvia neu starten.

Keine neue Supabase-Migration und kein Edge-Function-Deployment erforderlich. Bereits hochgeladene Fotos erhalten rückwirkend keine zuvor verworfenen EXIF-Daten; die robuste EXIF-Auswertung greift bei neuen Original-Uploads.
