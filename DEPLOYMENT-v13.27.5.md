# Deployment 13.27.5

## Entscheidung

**Nur Frontend.** Keine Edge Function und keine Datenbankmigration wurde geändert.

```bash
git add .
git commit -m "feat: add media and diagnostics readiness audit for 13.27.5"
git push
```

Danach alle Luvia-Tabs schließen, die installierte PWA vollständig beenden, `force-update.html` öffnen, Update ausführen, App neu starten und App **13.27.5 / Core 4.27.5** kontrollieren.

Nicht ausführen:

- kein `supabase db push`
- kein Function-Deploy
- keine Secrets-Änderung
