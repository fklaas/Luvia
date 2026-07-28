# Deployment v13.1.1.2

Keine Supabase-Migration, keine Edge-Function-Änderung und keine neuen Secrets.

```bash
git add .
git commit -m "fix(today): connect suggestions visits and gps-only distance"
git push
```

Nach dem Hosting-Deployment das PWA-Update installieren. Bei altem Stand Service Worker abmelden und Cache Storage leeren.
