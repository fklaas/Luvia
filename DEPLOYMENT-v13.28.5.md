# Deployment 13.28.5

Keine Datenbankmigration.

## Edge Function
```bash
supabase functions deploy luvia-gateway
```

## Frontend
```bash
git add .
git commit -m "feat: stabilize uploads and add dynamic photo studio albums"
git push
```

Danach `force-update.html` öffnen und App 13.28.5 / Core 4.28.5 prüfen.
