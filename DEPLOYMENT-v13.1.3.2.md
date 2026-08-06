# Deployment 13.1.3.2

Keine Supabase-Migration, keine Edge-Function-Änderung und keine neuen Secrets.

```bash
git add .
git commit -m "fix(today): update schedule entries and eliminate dashboard flicker"
git push
```

Nach dem Hosting-Build das PWA-Update installieren. Bei altem Stand Service Worker abmelden und Cache Storage löschen.
