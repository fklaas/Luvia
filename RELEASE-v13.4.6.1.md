# Luvia 13.4.6.2 – Favorites-Only Place Shell

## Änderungen
- Die universelle Places-Sammlung zeigt ausschließlich Favoriten. Separate Bereiche für gespeicherte Places und Verlauf wurden aus der aktiven Place-Shell entfernt.
- Favoriten-Panels sind für alle Place-Typen standardmäßig zugeklappt.
- Restaurant- und Unterkunftssuche interpretieren den Kartenstatus nur noch als Favorit, nicht als bloß verknüpft oder gespeichert.
- Der universelle Datumseditor zeigt je Place-Typ nur fachlich gültige Felder: Restaurants besitzen genau ein Planungsdatum, Unterkünfte Check-in und Check-out.
- Die Aktionen „Datum und Uhrzeit ändern“ und „Löschen“ verwenden global dieselbe kleine, dezente Typografie.
- UI-Lifecycle-Bezeichnungen stellen den historischen Status `saved` nicht mehr als eigenständige Nutzeraktion dar.

## Architektur
- `LuviaPlaceCollections.favoritePanel()` ist der verbindliche Collection-Renderer.
- Neue Place-Typen dürfen keine eigene „Gespeichert“-Sammlung und keinen separaten Save-Button einführen.
- Fachliche Persistenz bleibt cloudseitig in `trip_places` und `trip_place_data`; die Nutzeroberfläche kennt nur Favoriten und typabhängige Planung.

## Migrationen
Keine neue SQL-Migration erforderlich.

## Bekannte Grenzen
Historische Datensätze mit dem Lifecycle `saved` bleiben aus Kompatibilitätsgründen in der Datenbank lesbar, werden aber nicht mehr als eigene Sammlung oder Aktion angezeigt.
