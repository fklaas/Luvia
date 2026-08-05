# Test v13.28.7.2

## Automatisch geprüft

- JavaScript-Syntax: `global-place-contracts.js`
- JavaScript-Syntax: `places-final-foundation.js`
- Query-Normalisierung: `Fallschirmspringen in München München` -> `Fallschirmspringen`
- Nischen-Kaskade enthält keine allgemeinen Varianten `Aktivität`, `Erlebnis`, `Freizeit`
- Zielort wird je Suchvariante nur einmal ergänzt
- Gateway enthält serverseitigen Nischen-Relevanzfilter
- Versionsstände v13.28.7.2 / Core v4.28.7.2 konsistent ersetzt
- ZIP-Integrität wird nach Erstellung geprüft

## Produktionstest

Nach Deployment nach `Fallschirmspringen in München` suchen. Erwartung:

- `providers.used` enthält Google und Foursquare, sofern beide antworten.
- `providers.errors` ist leer.
- Hofbräuhaus und andere Orte ohne Fallschirm-/Skydiving-Bezug fehlen.
- Intent-Text enthält keine doppelte Destination.
