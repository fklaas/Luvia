# Deployment – Luvia 13.27.5.1

## Art
Nur Frontend. Keine Migration und kein Edge-Function-Deployment.

```bash
git add .
git commit -m "fix: repair diagnostics loading and media readiness tests"
git push
```

Danach alle Tabs schließen, PWA vollständig beenden, `force-update.html` öffnen, Update ausführen und App neu starten. Sichtbare Version: App 13.27.5.1 / Core 4.27.5.1.

Nicht ausführen: `supabase db push`, Function-Deployments oder Secret-Änderungen.
