# Luvia Build 13.9.0.1 / Core 4.9.0.1

## Global Places Contract Bootstrap & Timeline Recovery

Dieser Fix behebt eine globale Places-Core-Regression, die beim Test von Shopping sichtbar wurde und tatsächlich alle contract-basierten Place-Typen betraf. Nur Restaurants funktionierten weiter, weil deren bestehender Planungspfad noch einen älteren eigenen Dialog verwendet.

Ein fehlgeschlagener Request auf `core/places/place-type-contract.js` führte bisher dazu, dass `place-type-definitions.js` unmittelbar beim Zugriff auf `register` abbrach. Dadurch wurden die kanonischen Timeline-Schemas für Unterkünfte, Sehenswürdigkeiten, Fotospots und Shopping nicht registriert. Jeder Klick auf „Zur Timeline“ endete anschließend mit wiederholten Promise-Fehlern.

## Behoben

- Der PWA App-Shell-Cache enthält jetzt die vollständige kritische Places-Startkette einschließlich Place-Type-Contract, Definitions, Timeline Core und UI Actions.
- Eine neue Service-Worker-Version wird nur aktiviert, wenn alle kritischen Places-Dateien erfolgreich geladen und gecacht wurden.
- Versionierte Asset-URLs wie `?v=13.9.0.1` können auf den passenden App-Shell-Eintrag ohne Query-String zurückfallen.
- Auch echte HTTP-Fehlerstatus werden auf einen vorhandenen Cache-Eintrag zurückgeführt; nicht nur geworfene Netzwerkfehler.
- `place-type-definitions.js` besitzt einen zentralen Recovery-Bootstrap mit drei begrenzten Wiederholungsversuchen und Cache-Busting.
- Die Place Registry aktualisiert Place-Typen nach einer verspäteten Contract-Registrierung automatisch.
- Der globale Timeline-Dialog wartet vor dem Öffnen auf die Place-Type-Definitions.
- Fehlende Timeline-Schemas erzeugen eine kontrollierte sichtbare Fehlermeldung statt unkontrollierter `Uncaught (in promise)`-Serien.
- Unterkünfte, Sehenswürdigkeiten, Fotospots und Shopping warten beim Klick auf „Zur Timeline“ auf den gemeinsamen Dialogpfad.
- PWA Runtime und Service Worker verwenden wieder exakt denselben Cache-Namen.
- `force-update.html` öffnet nach der Cache-Bereinigung ausdrücklich Build 13.9.0.1.

## Architektur

Es wurde kein lokales Timeline-Schema in einem Place-Modul ergänzt. Alle fünf produktiven Place-Typen beziehen ihre Datumsfelder weiterhin ausschließlich aus dem globalen Place-Type-Contract:

- `restaurant` → `planned_at`
- `accommodation` → `check_in_at` und `check_out_at`
- `attraction` → `starts_at`
- `photo_spot` → `planned_at`
- `shopping` → `planned_at`

Restaurant bleibt fachlich unverändert. Der Fix schließt den Bootstrap-Unterschied zu den übrigen Place-Typen, ohne deren Datenmodelle oder UI-Shells zu duplizieren.

## Datenbank und Gateway

Keine SQL-Migration und keine fachliche Gateway-Änderung. Die Gateway-Version wird zur konsistenten Plattformanzeige auf 13.9.0.1 / 4.9.0.1 angehoben.
