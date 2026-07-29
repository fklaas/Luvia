# Luvia Build 13.3.2 – Universal Places Experience Shell

## Ergebnis
- Ein einziger Navigationspunkt **Places** ersetzt separate Navigationseinträge für Restaurants und Unterkünfte.
- Places öffnet zunächst eine modulabhängige Kachelauswahl.
- Restaurants und Unterkünfte laufen anschließend im selben Experience-Container mit weichem Fade-Wechsel.
- Die Unterkunftssuche nutzt die visuelle Restaurant-Experience, `LuviaPlaceUI`-Karten und die bestehende Place-Entity-Pipeline.
- Unterkunftsdetails verwenden die gemeinsame große Place-Experience mit Galerie, Match, Fakten, Bewertung und kontextspezifischen Aktionen.
- Unterkunftsspezifische Felder bleiben capability-basiert: Check-in, Check-out, Buchung und Reisebasis erscheinen nur für `accommodation`.
- Änderungen an Reisemodulen aktualisieren Dock und Places-Auswahl unmittelbar ohne Reload.

## Architektur
`restaurants` und `accommodations` bleiben fachliche Module und Provider-/Lifecycle-Adapter. `LuviaPlacesShell` ist der gemeinsame UI-Container. `LuviaPlaceUI` bleibt die universelle Karten-API. Damit können weitere Place-Typen später über Metadaten und Capabilities ergänzt werden, ohne eigene Navigation oder vollständige UI-Doppelstruktur.

## Grenzen
Restaurant-spezifische Reservierungs- und Speisekartenfunktionen bleiben ausschließlich beim Typ `restaurant`. Unterkunftsbuchung und Check-in/-out bleiben ausschließlich beim Typ `accommodation`.
