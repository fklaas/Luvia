# Luvia Build 13.11.2 / Core 4.11.2

## Cycling Discovery Provider Rebuild & Reliable Results

Dieser Build ersetzt die bisherige Fahrradrouten-Suche grundlegend. Der produktive Test von 13.11.1 zeigte, dass die Kombination aus einer großen Overpass-Abfrage und strengem Profilfilter trotz größerem Radius vollständig leer bleiben konnte.

## Neue gestufte Datenpipeline

Die Suche verwendet nun drei voneinander unabhängige Quellen:

- ausgeschilderte OSM-Routenrelationen über `cycling.search.routes`,
- MTB-/Gravel-Wegmerkmale und Trailgebiete über `cycling.search.trails`,
- Bikeparks, Trailzentren, Pumptracks und Tour-Startpunkte über die zentrale Places-Pipeline.

Alle Quellen laufen parallel. Jede Quelle kann Ergebnisse sofort ergänzen. Ein Fehler oder Timeout einer Quelle entfernt keine bereits sichtbaren Treffer und macht die anderen Quellen nicht unbrauchbar.

## Routenrelationen werden nicht mehr profilbedingt verworfen

Die leichte Routenabfrage lädt immer `route=bicycle` und `route=mtb`. Das gewählte Profil steuert anschließend Ranking und Kennzeichnung:

- `exact` – exakter Profiltreffer,
- `related` – fachlich passende Alternative,
- `fallback` – allgemeine Fahrradroute.

Damit bleibt eine regionale Radrunde sichtbar, wenn im gewählten Umkreis keine exakt als MTB markierte Relation existiert. Sie wird dabei nicht als MTB-Trail umetikettiert.

## Unbenannte MTB- und Gravel-Wege

OSM-Wegsegmente mit `mtb:scale`, `mtb:type`, `bicycle:mtb` oder geeignetem Gravel-Untergrund werden separat und in kleineren Teilradien geladen. Unbenannte, räumlich nahe Segmente werden zu einem `trail_area` gebündelt.

Ein Trailgebiet ist ausdrücklich keine vollständige Tour. Luvia erfindet deshalb weder Streckenlänge noch Rundtour oder Fahrzeit. Die Detailkarte erläutert diesen Status transparent.

## Neue Ergebnisarten

- `route_relation`
- `trail_segment`
- `trail_area`
- `trail_center`
- `cycling_area`

Die Ergebnisart und Trefferstufe werden über `trip_place_data` cloudseitig mitgespeichert.

## Suchradien

Verfügbar sind jetzt 50, 100, 150, 200 und 300 km. Die empfohlene Auswahl wird je Profil gesetzt:

- MTB 200 km,
- Gravel 150 km,
- Entdecken und klassische Routen 150 km,
- City 60 km,
- Familie 75 km.

Große Radien werden für die leichte Relationssuche genutzt. Wegsegment-Abfragen bleiben bewusst auf kleinere Teilräume begrenzt.

## Initiales Laden

Das Modul startet nicht mehr automatisch im strikten MTB-Profil. Der Einstieg „Entdecken“ lädt zunächst alle Fahrradrouten und Trails. MTB bleibt die wichtigste sichtbare Fachkategorie und erhält beim Anklicken automatisch den größeren empfohlenen Radius.

## Fehlerbehandlung

- getrennte Providerwarnungen,
- Retry leert gezielt die Fahrradrouten-Caches,
- alte Suchantworten werden weiterhin verworfen,
- keine Quelle darf die gesamte Ergebnisliste zurücksetzen,
- bei fehlenden exakten Treffern wird die Erweiterung des Suchergebnisses sichtbar erklärt.

## Architektur

Unverändert global:

- Module-Shell,
- Karten,
- Favoriten,
- Detailkarte,
- Timeline,
- Cloud-Persistenz,
- Reiseisolation,
- Commands,
- Conformance.

Es wurde keine parallele Fahrradrouten-Datenbank oder lokale Persistenz eingeführt.
