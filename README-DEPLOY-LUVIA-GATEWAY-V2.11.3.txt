LUVIA GATEWAY V2.11.3 DEPLOY

Voraussetzungen:
1. GOOGLE_PLACES_API_KEY ist als Supabase Secret gesetzt.
2. Places API (New) ist in Google Cloud aktiviert.
3. Für Zeitzonen zusätzlich Google Time Zone API aktivieren und in den API-Key-Beschränkungen erlauben.

Deployment im Projektordner:

npx supabase@latest functions deploy luvia-gateway --use-api

Danach in Luvia:
Intelligence > Backend & Places > Ziel neu auflösen

Erwartet:
- Zeitzone z. B. Europe/Berlin
- Sprache z. B. de
- Währung EUR
- dynamischer Radius
