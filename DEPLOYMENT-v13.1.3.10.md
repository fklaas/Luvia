# Deployment 13.1.3.10

1. Im Google-Cloud-Projekt die **Routes API** aktivieren. Der vorhandene Google-Maps-/Places-Key wird verwendet.
2. In Supabase Edge Functions `luvia-gateway` ergänzen:
   - neue Datei `_shared/routes.ts`
   - aktualisierte `index.ts`
3. `luvia-gateway` deployen.
4. Frontend committen und deployen.
5. PWA-Update installieren beziehungsweise Cache aktualisieren.

Keine SQL-Migration und kein neues Secret erforderlich, sofern `GOOGLE_PLACES_API_KEY` oder `GOOGLE_MAPS_API_KEY` bereits gesetzt ist.
