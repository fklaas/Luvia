# Deployment 13.29.4

1. Migration `supabase/migrations/20260805223000_media_delivery_rebuild.sql` ausführen (`supabase db push`).
2. Den vollständigen Web-Build veröffentlichen.
3. `force-update.html` öffnen.
4. Alle Luvia-Tabs und die installierte PWA vollständig schließen.
5. App neu öffnen und die Fotogalerie testen.

Keine Edge Function muss neu deployed werden.

Bestehende Medien nutzen zunächst serverseitige Bildtransformationen. In Leerlaufphasen erzeugt Luvia schrittweise die permanenten WebP-Varianten. Neue Uploads erhalten alle Varianten sofort.
