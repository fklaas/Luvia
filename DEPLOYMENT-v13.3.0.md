# Deployment – Luvia 13.3.0

Für diesen Build ist nur das Frontend zu veröffentlichen.

## Nicht erforderlich

- keine SQL-Migration
- kein Supabase-Functions-Deployment
- keine neuen Secrets
- keine Änderungen an RLS-Policies

## Nach dem Deployment

1. GitHub Pages Build abwarten.
2. `myluvia.app` in einem privaten Browserfenster öffnen.
3. Prüfen, dass die öffentliche Landingpage statt des alten Login-Screens erscheint.
4. „Reise beginnen“, freie Eingabe, Registrierung, Anmeldung und Einladung testen.
5. Bei installierter PWA einmal vollständig neu laden. Der Service-Worker-Cache heißt `luvia-shell-v13.3.0`.
