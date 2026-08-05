# Luvia 13.28.7.1 / Core 4.28.7.1

## Foursquare Provider Contract Correction

- Entfernt die vom aktuellen Foursquare Places Search Endpoint nicht akzeptierten Felder `geocodes` und `timezone` aus dem `fields`-Parameter.
- Nutzt die offizielle API-Version `2025-06-17`; optional überschreibbar über `FOURSQUARE_API_VERSION`.
- Unterstützt Koordinaten sowohl aus älteren `geocodes.main`-Antworten als auch aus aktuellen `location.latitude/location.longitude` beziehungsweise Place-Koordinaten.
- Google bleibt als isolierter Fallback aktiv.
- Keine Datenbankmigration erforderlich.

## Deployment

```bash
supabase functions deploy luvia-gateway
```

Danach Web-Build deployen, `force-update.html` öffnen und die App vollständig neu starten.
