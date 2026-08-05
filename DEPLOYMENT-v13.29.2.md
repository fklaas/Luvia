# Deployment 13.29.2

1. Run `supabase db push` or execute `supabase/migrations/20260805213000_instant_media_cache_cluster_integrity.sql` in the SQL editor.
2. Deploy the complete web build.
3. Open `force-update.html` once.
4. Close all Luvia tabs/PWA windows and reopen the app.
5. Open Erinnerungen → Fotogalerie twice. The second opening must use the persistent preview cache.

No Edge Function deployment is required.
