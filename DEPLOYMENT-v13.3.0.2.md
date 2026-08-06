# Deployment – Luvia 13.3.0.2

## Erforderlich

Nur das vollständige Frontend veröffentlichen.

1. ZIP entpacken oder den Inhalt in den bestehenden Deployment-Branch übernehmen.
2. Alle geänderten Dateien committen.
3. GitHub Pages / den bestehenden Hosting-Workflow ausführen.
4. Nach erfolgreichem Deployment die Website einmal vollständig neu laden.
5. Bei installierter PWA das angebotene Update aktivieren oder die App neu öffnen.

## Nicht erforderlich

- keine SQL-Migration
- kein Supabase-Functions-Deployment
- keine neuen Secrets
- keine Änderungen an RLS-Policies

## Cache

Service Worker: `luvia-shell-v13.3.0.2`
