# Deployment 13.1.1.1

Keine Supabase-Migration, keine Edge-Function-Änderung und keine neuen Secrets.

```bash
git add .
git commit -m "fix(context): use global gps for place distances"
git push
```

Nach dem Hosting-Deployment das PWA-Update installieren. Bei altem Stand Service Worker und Cache Storage löschen.
