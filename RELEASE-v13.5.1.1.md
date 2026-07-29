# Luvia Build 13.5.1.2 — Compact Place Cards & Places Hub Navigation Fix

## Änderungen

- Kleine Place-Karten rendern ausschließlich die globalen Fact-Slots.
- Alte Restaurant- und Unterkunfts-Chips wie Budget-Match, Beliebtheit, Barrierefreiheit, Gästezahl oder Reisebasis wurden aus kompakten Karten entfernt. Die zugrunde liegenden Daten bleiben für Detailkarten und spätere Intelligence erhalten.
- Ein Klick auf den Dock-Eintrag „Places“ führt aus einem geöffneten Place-Bereich immer zurück zur zentralen Places-Auswahl.
- Der vorhandene Zurück-Button und der Dock-Eintrag nutzen nun denselben `LuviaPlacesShell.showHub()`-Ablauf.

## Versionen

- App Build: 13.5.1.2
- Core: 4.5.1.2
- PWA Cache: luvia-shell-v13.5.1.2
