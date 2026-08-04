# Deployment 13.28.1

1. `supabase db push`
2. Migration `20260804235600_media_smart_photo_clustering.sql` in der History kontrollieren.
3. `git add .`
4. `git commit -m "feat: add smart photo clustering and shared moment UI"`
5. `git push`
6. PWA schließen, `force-update.html` öffnen und Version 13.28.1 / Core 4.28.1 prüfen.

Keine Edge Function und keine Secrets geändert.
