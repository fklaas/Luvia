# Luvia Build 13.14.0 / Core 4.14.0

## Transport & Mobility Intelligence

Build 13.14.0 entfernt den unzuverlässigen Fahrradrouten-Place vollständig aus der produktiven Runtime und führt stattdessen den zuverlässigen Place-Typ **Transport & Mobilität** ein.

## Neuer produktiver Place: `mobility`

Der neue Place nutzt ausschließlich die verbindliche globale Places-Architektur. Shell, Karten, Favoriten, Detailkarte, Timeline, Cloud-Persistenz, Reiseisolation und Conformance werden nicht lokal dupliziert.

Kategorien:

- Entdecken
- Bahn & Fernverkehr
- Metro & U-Bahn
- Bus & Tram
- Fähren
- Flughäfen
- Taxi
- Parken
- Mietwagen
- E-Laden
- Bike-Sharing

Die Discovery verwendet konkrete Google-Places-Typen. Mehrteilige Kategorien starten mehrere exakte Suchen parallel, führen die Ergebnisse zusammen, entfernen Duplikate und sortieren nach Relevanz, Entfernung und Bewertung.

Großräumige Kategorien wie Flughäfen, Fährterminals und Mietwagen verwenden eine Standortgewichtung statt eines engen Ziel-Viewports. Lokale Kategorien bleiben strikt am kanonischen Reiseziel gebunden.

## Transport Intelligence

Neu ist `LuviaTransportIntelligence` mit dem globalen Capability Renderer `mobility`.

Die Detailkarte zeigt:

- Verkehrsart
- Rolle im Reiseablauf
- empfohlenen Zeitpuffer
- Zugang und Barrierefreiheit
- Betriebs- und Öffnungshinweise
- Parkmöglichkeiten
- Ladeoptionen
- Ticket- oder Nutzungshinweis

Luvia erfindet keine Live-Abfahrten, Verspätungen, Belegungen, freien Ladepunkte oder Preise.

## Fahrradrouten entfernt

Aus produktiver Runtime und Auslieferung entfernt wurden:

- Fahrradrouten-Modul und Styles
- Cycling Intelligence und Provider-Service
- Cycling-Adapter und Place-Contract
- Cycling-Gateway-Actions
- Trailforks-, Overpass- und openrouteservice-spezifische Cycling-Integration
- Cycling-Diagnostics und Cycling-Regressionstests
- Fahrradrouten-Kachel und alle aktiven UI-Einstiegspunkte

Die historische Migration, die `cycling_route` früher als zulässigen Datenbankwert ergänzt hat, verbleibt bewusst im Migrationsverlauf. Sie wird nicht zurückgerollt und aktiviert keine Runtime-Funktion.

## Timeline und Cloud

Mobilitätspunkte verwenden das kanonische Timeline-Feld `planned_at`. Fachliche Erweiterungsfelder werden über die bestehende `trip_place_data`-Pipeline gespeichert. Es gibt keine neue Tabelle und keine neue SQL-Migration.
