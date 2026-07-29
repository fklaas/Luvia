# Luvia 13.5.6 – Deterministic Place Planning & Complete Stay Detail

## Behoben
- Der globale Restaurant-Button „Zur Timeline“ nutzt wieder die kanonische Place-Verknüpfung.
- Import-Antworten werden unabhängig von zusätzlicher Backend-Verschachtelung sicher normalisiert.
- Restaurant und Reise werden bereits beim Import mit Status, Datum und Uhrzeit verbunden.
- Nach erfolgreicher Planung bleibt die zweite Aktion eine Timeline-Aktion und wird nicht mehr fälschlich zu einem zweiten Favoritenbutton.
- Timeline-Daten werden unmittelbar nach der Planung hydriert und über das zentrale Place-Plan-Event veröffentlicht.
- Der Block „Aufenthalt & Buchung“ ist bei Unterkünften bereits im ersten vollständigen Detail-Render vorhanden.
- Die Aufenthaltsfelder sind bereits während des anschließenden Detail- und Foto-Ladens funktionsfähig.

## Architektur
Restaurantplanung und Unterkunftsplanung bleiben vollständig auf den globalen Services `LuviaPlaceEntities`, `LuviaPlaceCollections`, `LuviaTripPlaceData` und `LuviaTimelineCore` aufgebaut. Es wurde keine parallele Fachlogik eingeführt.
