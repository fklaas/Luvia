# Deployment 13.24.1

## Google Cloud
1. Im Google-Cloud-Projekt die **Routes API** aktivieren.
2. Billing muss für das Projekt aktiv sein.
3. Der vorhandene API-Key muss die Routes API verwenden dürfen.
4. Empfohlen: API-Key auf Places API (New) und Routes API beschränken.

## Supabase Secrets
Falls noch nicht vorhanden:

```powershell
supabase secrets set GOOGLE_MAPS_API_KEY="DEIN_GOOGLE_MAPS_API_KEY"
```

Alternativ verwendet der Gateway weiterhin `GOOGLE_PLACES_API_KEY` als Fallback.

## Function Deployment

```powershell
supabase functions deploy luvia-gateway
```

Für diesen Build ist kein neues Datenbankschema erforderlich.
