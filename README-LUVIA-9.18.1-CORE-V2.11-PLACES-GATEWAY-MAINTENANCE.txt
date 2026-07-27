LUVIA BUILD 9.18.2 / CORE 2.11.0 — PLACES GATEWAY MAINTENANCE

PLACES GATEWAY

Neue öffentliche API:
- window.LuviaPlaces
- window.LuviaPlacesGateway
- window.LuviaIntelligence.places

Backend-Seite:
https://myluvia.app/intelligence/backend.html

Erforderliches Supabase Secret:
GOOGLE_PLACES_API_KEY=<Google Maps Platform API Key>

Danach erneut deployen:
npx supabase@latest functions deploy luvia-gateway --use-api

Empfohlene Google-Cloud-Konfiguration:
- Places API (New) aktivieren
- Billing aktivieren
- API-Key auf Places API (New) beschränken
- Key niemals in GitHub oder Browser-Konfiguration eintragen


Maintenance: Platform-Core-Versionsprüfung korrigiert; Places-Flag und Build-Metadaten vereinheitlicht.
