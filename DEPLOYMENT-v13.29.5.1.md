# Deployment 13.29.5.1

1. Vollständigen Web-Build veröffentlichen.
2. Edge Function deployen: `supabase functions deploy luvia-media-delivery`.
3. Keine neue SQL-Migration erforderlich; die Migrationen aus 13.29.4/13.29.5 müssen bereits aktiv sein.
4. `force-update.html` öffnen und Luvia vollständig neu starten.
5. Backfill erneut mit `tripId` und `limit` ausführen. Die Antwort enthält jetzt `stage`, `message`, `details` und `hint`, falls ein Schritt scheitert.
