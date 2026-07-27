# Luvia v9.18.3 – Destination Geocoding & Places Restriction

## Core V2.11.1

- Reisezielnamen werden automatisch über das sichere Supabase Gateway mit Google Places aufgelöst.
- Destination Context speichert Place-ID, Land, Ländercode, Koordinaten, Viewport, Provider und Auflösungszeitpunkt.
- Bestehende Reisen werden beim ersten Laden automatisch nachgeocodiert und lokal aktualisiert.
- Text Search verwendet den Destination-Viewport als harte geografische Einschränkung. Ohne Viewport wird ein zielbezogener Radius verwendet.
- Places Explorer wartet vor der Suche auf die automatische Zielauflösung.
- Backend Dashboard zeigt Ziel, Land, Koordinaten, Radius, Provider und Geocoding-Status.
- Neue Gateway-Aktion: `destination.resolve`.
- Legacy-Destination-Content überschreibt den Core-Destination-Service nicht mehr.

## Deployment

Die Supabase Edge Function `luvia-gateway` muss nach dem Update erneut deployt werden.

```bash
supabase functions deploy luvia-gateway
```

Das Secret `GOOGLE_PLACES_API_KEY` muss weiterhin gesetzt sein.
