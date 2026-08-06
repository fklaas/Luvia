# Deployment v9.22.4

1. Gesamtpaket in das GitHub-Repository übernehmen.
2. Commit und Push ausführen.
3. Cloudflare Pages Deployment abwarten.
4. App vollständig schließen und erneut öffnen.
5. Bei altem UI einmal `force-update.html` öffnen oder Website-Daten/Cache löschen.

Service-Worker-Cache: `luvia-shell-v9.22.4`.

## Supabase
Keine SQL-Migration. Kein Edge-Function-Deployment nötig, da das Gateway fachlich unverändert bleibt.
