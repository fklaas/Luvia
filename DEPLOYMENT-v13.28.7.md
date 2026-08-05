# Deployment 13.28.7

1. Vollständigen Web-Build deployen.
2. Supabase Edge Function aus diesem Projektordner deployen:

```bash
supabase functions deploy luvia-gateway
```

3. Prüfen, dass `FOURSQUARE_API_KEY` und `GOOGLE_PLACES_API_KEY` als Supabase Secrets vorhanden sind.
4. `force-update.html` öffnen und App neu starten.
5. Unter Places `Fallschirmspringen in München` sowie eine Restaurantanfrage testen.
