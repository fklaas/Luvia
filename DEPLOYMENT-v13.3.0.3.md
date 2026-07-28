# Deployment – Luvia 13.3.0.3

## Erforderlich

Nur das vollständige Frontend-Paket veröffentlichen.

## Nicht erforderlich

- keine SQL-Migration
- kein Supabase-Functions-Deployment
- keine neuen Secrets
- keine Änderungen an RLS-Policies

## Nach dem Upload

1. GitHub Pages beziehungsweise das verwendete Frontend-Hosting neu deployen.
2. Warten, bis der Pages-Build erfolgreich abgeschlossen ist.
3. `myluvia.app` auf dem iPhone vollständig neu laden.
4. Bei installierter PWA das Update aktivieren oder die App einmal schließen und neu öffnen.

Service-Worker-Cache: `luvia-shell-v13.3.0.3`
