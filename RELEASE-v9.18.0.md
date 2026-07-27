# Luvia v9.18.0 — Intelligence Core v2.11.0 Places Gateway

## Überblick

Core V2.11 führt das zentrale Places Gateway ein und ergänzt die Developer Console um eine eigenständige Backend-&-Places-Seite. Sämtliche Google-Places-Aufrufe laufen ausschließlich über die bestehende Supabase Edge Function `luvia-gateway`; der Google API-Key bleibt serverseitig als Supabase Secret gespeichert.

## Neu

- öffentliche `LuviaPlaces` / `LuviaPlacesGateway` API
- Text Search, Nearby Search, Autocomplete, Place Details und Place Photos
- zentrale Normalisierung von Google-Place-Daten
- automatischer Destination-Kontext für Suchanfragen
- kurzlebiger serverseitiger Suchcache ohne Fotoressourcen
- Request-, Fehler- und Cache-Metriken
- Places Diagnostics und Service-Selbsttest
- Kernel- und Service-Registry-Integration
- eigenständige Seite `intelligence/backend.html`
- Places Explorer mit produktiver Live-Suche
- Backend-Status, Auth-Status, Antwortzeiten, Request-Historie und Diagnose-Snapshots
- aktualisierte Edge Function mit Places-Allowlist, Rate Limit und strukturiertem Logging

## Sicherheit

Der Browser erhält niemals den Google Places API-Key. Das Secret heißt:

`GOOGLE_PLACES_API_KEY`

Suchantworten werden nur kurzzeitig serverseitig zwischengespeichert. Fotoressourcennamen, Place Photos, Autocomplete und Details werden nicht im Places-Cache gespeichert.

## Versionen

- Build: `9.18.0`
- Intelligence Core: `2.11.0`
- Places Service: `2.11.0-places-gateway`
- Edge Gateway: `2.11.0`
- PWA Cache: `luvia-shell-v9.18.0`
