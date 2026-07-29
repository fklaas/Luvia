# Luvia 13.4.6 – Universal Place Collections & Planning Contract

## Änderungen
- Globale Favoriten-Pipeline für alle Place-Typen mit kanonischen Lifecycle-Statuswerten.
- Restaurant-Favoriten verwenden denselben Cloud-Vertrag wie Unterkünfte.
- Restaurant-Planungen werden sofort in `trip_place_data` persistiert und live in Timeline und Places-Shell angezeigt.
- Einheitliche Favoriten-Sammlung mit Kartenraster, Fotos und „Alle entfernen“.
- Klick auf Favorit löst keine Detailkarte aus.
- Neue idempotente Migration 035 erweitert die Übergangskompatibilität des Lifecycle-Constraints.

## Architektur
`LuviaPlaceCollections` ist der verbindliche Core für Favoriten, Collections und typübergreifende Planungsfelder. Neue Place-Typen dürfen keine eigenen Favoriten- oder Live-Refresh-Pfade implementieren.

## Grenzen
Der abschließende Place Type Contract & Conformance Build folgt als eigener Architekturtest mit einem dritten Place-Typ.
