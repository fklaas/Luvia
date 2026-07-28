# Deployment Build 13.0.3.3

Keine Supabase-Migration, keine Edge-Function-Änderung und keine neuen Secrets.

```bash
cd /pfad/zum/luvia-main
git add .
git commit -m "fix(ui): polish restaurant search planning and match presentation"
git push
```

Nach dem Hosting-Deployment die PWA aktualisieren. Falls weiterhin Build 13.0.3.2 geladen wird, Service Worker abmelden, Cache Storage löschen und neu laden.
