LUVIA GATEWAY V2.11.2 – DESTINATION TIMEZONE MAINTENANCE

Geänderte Dateien:
- supabase/functions/luvia-gateway/index.ts
- supabase/functions/luvia-gateway/_shared/places.ts

Enthalten:
- destination.resolve über Google Places
- Koordinaten, Land, Ländercode, Place-ID und Viewport
- optionale automatische Zeitzonenauflösung über Google Time Zone API
- geografische Einschränkung der Textsuche per Viewport
- Radius-Fallback über locationBias
- erweiterte Gateway-Metriken für Zeitzonenanfragen

Deployment aus dem Projekt-Hauptordner:
  supabase functions deploy luvia-gateway

Voraussetzungen in Supabase Secrets:
  GOOGLE_PLACES_API_KEY
  LUVIA_ALLOWED_ORIGINS

Hinweis zur Zeitzone:
Für das Feld timezone muss im selben Google-Cloud-Projekt zusätzlich die Time Zone API aktiviert sein.
Ist sie nicht aktiviert, funktionieren Zielauflösung und Places-Suche trotzdem; timezone bleibt dann leer.
