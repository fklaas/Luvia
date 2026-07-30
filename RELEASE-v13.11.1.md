# Luvia Build 13.11.1 / Core 4.11.1

## Cycling Place Core Conformance & Fast Discovery

Dieser Build korrigiert die Fahrradrouten-Implementierung nach dem produktiven Test. Der Place-Typ war technisch registriert, wich aber in zwei wesentlichen Punkten vom verbindlichen Places-Core ab:

1. Das Modul besaß einen lokalen Header-Override und baute Teile der Modul-Shell selbst.
2. Die Routensuche blockierte zu lange auf externe OSM-Daten und lieferte durch zu strenge Kategorienfilter teilweise wenige oder unpassende Ergebnisse.

## Globale UI-Conformance

Neu ist der zentrale Renderer:

```javascript
LuviaPlaceExperience.moduleShell(...)
```

Er besitzt verbindlich:

- dieselbe Modulwurzel,
- denselben Header,
- dieselbe Typografie,
- dieselben Abstände,
- dieselben Reisefarben,
- denselben Planned-Bereich,
- dieselbe Discovery-Shell,
- dieselbe Favoritensammlung.

Fahrradrouten verwenden diesen Renderer jetzt direkt. Die lokale Klasse `luv-cycling-head` und ihr eigener Hintergrund wurden entfernt. Die Fahrradrouten-CSS-Datei enthält nur noch fachlich notwendige Ergänzungen für Routenvorschau, Radiusauswahl und Cycling-Insights.

Der globale `PlaceUIContract` benennt `LuviaPlaceExperience.moduleShell` nun ausdrücklich als Shell-Renderer. Die Conformance-Prüfung meldet einen Verstoß, falls Fahrradrouten erneut einen lokalen Header oder eine eigene Shell verwenden.

## Schnelle progressive Suche

Die Suche wartet nicht mehr auf alle Provider, bevor Ergebnisse sichtbar werden.

- OSM-Routen und passende Trailzentren werden parallel angefragt.
- Der erste Provider darf sofort Ergebnisse rendern.
- Weitere Treffer werden ohne Seitenreload ergänzt.
- Bereits geladene Treffer bleiben sichtbar, während die zweite Quelle noch läuft.
- Das initiale Mounting wartet nicht mehr auf die komplette Routensuche.
- Suchergebnisse werden zehn Minuten clientseitig zwischengespeichert.
- Ein neuer Suchlauf verwirft verspätete Antworten eines älteren Suchlaufs.

## Größerer Suchradius

Der Standardradius wurde von 50 km auf 100 km erhöht.

Verfügbar sind jetzt:

- 50 km
- 100 km
- 150 km
- 200 km

Damit lassen sich insbesondere MTB-Trails und Gravel-Touren sinnvoll über den unmittelbaren Stadtbereich hinaus finden.

## OSM-Provider-Performance

Die Overpass-Abfragen wurden neu aufgebaut:

- Endpunkte werden parallel statt seriell angefragt.
- Der erste erfolgreiche Endpunkt gewinnt.
- Provider-Timeout pro Endpunkt: 7,2 Sekunden.
- Suchabfrage verwendet einen Overpass-Timeout von 8 Sekunden.
- Suchfehler werden weich als leere OSM-Quelle mit Warnhinweis behandelt, damit das Backend nicht mehrfach dieselbe langsame Suche wiederholt.
- MTB- und Gravel-Way-Abfragen verwenden kleinere Teilradien als das Routennetz, um sehr große Abfragen zu vermeiden.

## Qualitätsranking

Die Routen werden nicht mehr nur nach grobem Routentyp sortiert. Der neue Qualitätswert berücksichtigt:

- exakte Übereinstimmung mit MTB, Gravel, City oder Familie,
- echte OSM-Routenrelation statt eines einzelnen Wegsegments,
- vorhandenen Routennamen,
- Entfernung vom Reiseziel,
- Distanzangabe,
- Netzwerk und Referenz,
- MTB-Schwierigkeit,
- Untergrund,
- erkennbare Trail- oder Bikepark-Merkmale.

Generische Kategoriebegriffe wie `MTB`, `Trail`, `Gravel`, `Radtour` oder `Fahrradroute` filtern nicht mehr versehentlich alle fachlich passenden Ergebnisse heraus. Individuelle Suchbegriffe wie ein konkreter Trailname bleiben weiterhin wirksam.

## Google-Fallback bereinigt

Google Places dient nur noch als Ergänzung für eindeutig erkennbare:

- Bikeparks,
- Trailcenter,
- Pumptracks,
- MTB-Startpunkte,
- Velodrome beziehungsweise Fahrradparks.

Offensichtlich unpassende Shopping- und Modeergebnisse werden ausgeschlossen. Damit kann beispielsweise ein Bekleidungsgeschäft nicht mehr als Fahrradtour erscheinen.

## Datenhaltung und Architektur

- keine neue Tabelle,
- keine neue SQL-Migration,
- keine lokale fachliche Persistenz,
- unverändert `places`, `trip_places` und `trip_place_data`,
- unverändert globale Favoriten-, Timeline-, Detailkarten- und Command-Systeme,
- unverändert `planned_at` als kanonisches Planungsfeld.

## Tests

Neu ist:

```text
tests/cycling-search-performance.test.cjs
```

Der Test prüft unter anderem:

- globalen Module-Shell-Renderer,
- fehlenden lokalen Cycling-Header,
- progressives Provider-Laden,
- nicht blockierendes Mounting,
- 100-km-Standardradius,
- 200-km-Maximalradius,
- parallele Overpass-Endpunkte,
- Provider-Timeout,
- Qualitätsranking,
- Google-Fallback-Filter.
