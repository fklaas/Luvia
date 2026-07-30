# Luvia 13.6.5 · Core 4.6.5

## Global Place Persistence & Collection Closure

Dieser Build schließt die letzten Unterschiede zwischen den zentralen Place-Modulen bei Timeline-Persistenz und Favoritensammlungen.

### Behoben

- Sehenswürdigkeiten können aus der globalen Detailkarte wieder zuverlässig zur Timeline hinzugefügt werden.
- Provider-Place-IDs werden nicht mehr versehentlich als UUID an `luvia_upsert_trip_place_fields` übertragen.
- Der globale Timeline-Dialog entpackt Importantworten unabhängig von deren Gateway-Hülle und übernimmt die kanonische `tripPlace`-Verknüpfung.
- Die kanonische `place_id` wird vorrangig aus `trip_places` übernommen; nicht-kanonische Provider-IDs werden vor Cloud-Schreibvorgängen verworfen.
- „Alle entfernen“ in Favoritensammlungen wird zentral durch `LuviaPlaceCollections` verarbeitet.
- Restaurant, Unterkunft und Sehenswürdigkeit deklarieren ihren Place-Typ verbindlich an der gemeinsamen Favoriten-Shell.
- Der Restaurant-Moduleintrag verwendet wieder die aktuelle Core-Version statt einer veralteten festen Versionsnummer.

### Architektur

Die folgenden Verantwortlichkeiten liegen jetzt vollständig im globalen Place Core:

- Timeline-Dialog und Importauflösung: `LuviaPlaceUIActions`
- kanonische Place-Feld-Persistenz: `LuviaTripPlaceData`
- Favoritensammlung und Sammellöschung: `LuviaPlaceCollections`
- UI- und Source-Prüfung: `LuviaPlaceConformance`

Einzelne Place-Module liefern nur noch ihren `placeType`, ihre Daten und ihren Kartenrenderer.

### Datenbank

Keine Migration erforderlich. Die bestehende RPC-Funktion bleibt unverändert. Der Client übergibt ihr jetzt ausschließlich gültige kanonische UUID-Werte oder `null`.
