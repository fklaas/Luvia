# Deployment 13.28.3

1. `supabase db push`
2. Migration `20260805085000_gallery_experience_realtime.sql` in der History kontrollieren.
3. Frontend deployen:
   `git add . && git commit -m "feat: add realtime gallery editor favorites and day polaroids" && git push`
4. Alle Tabs/PWA schließen, `force-update.html` öffnen und 13.28.3 / Core 4.28.3 prüfen.

Keine Edge Function und keine Secrets ändern.
