# Luvia v9.22.1 – Restaurant Experience Fix

## Versionen
- Build 9.22.1
- Core 2.12.4.1

## Behoben
- Restaurant-Kategorien werden als stabile, einzeilige Chips dargestellt und umbrechen nicht mehr mitten im Wort.
- Das Restaurantmodul bevorzugt nun den aktiven, bereits vom Backend aufgelösten Destination Context.
- Kanonisches Stadtziel wird vor Legacy-Reisefeldern verwendet.
- Das Modul reagiert auf nachträglich eintreffende Destination- und Trip-Context-Ereignisse und rendert sich bei einem Zielwechsel neu.

## Architektur
Keine Parallelstruktur und keine neue SQL-Migration. Places Gateway und Restaurant Entity Pipeline bleiben unverändert.
