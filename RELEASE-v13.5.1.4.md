# Luvia 13.5.1.4 — Place UI Final Closure

## Änderungen
- Preisniveaus aus Google Places New werden global deutsch und nutzerfreundlich formatiert.
- `PRICE_LEVEL_MODERATE` erscheint als `Mittel · €€`.
- Google-Geschäftsstatus wird verständlich übersetzt, z. B. `Geöffnet und in Betrieb`.
- Telefon und Website werden über alle unterstützten normalisierten Provider-Aliase in „Details zum Ort“ angezeigt.
- Telefonnummern sind direkt anwählbar, Websites und Google Maps öffnen als externe Links.
- Karten und Detailkarten verwenden denselben globalen Preisformatierer.
- Abschluss der Place UI Contract & Visual Conformance Phase.

## Backend
Keine SQL-Migration, keine Edge-Function-Änderung und keine neuen Secrets.
