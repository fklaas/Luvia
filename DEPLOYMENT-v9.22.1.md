# Deployment v9.22.1

1. Gesamtpaket in das Repository übernehmen.
2. Änderungen committen und den produktiven Branch pushen.
3. Cloudflare/GitHub Deployment abwarten.
4. App vollständig schließen und neu öffnen; bei Bedarf Website-Daten/Service-Worker-Cache aktualisieren.

## Supabase
Kein erneutes Deployment von `luvia-gateway` nötig. Die Edge Function wurde in diesem Fix nicht verändert.

## SQL
Keine Migration erforderlich.
