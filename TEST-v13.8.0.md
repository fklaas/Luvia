# Testplan Build 13.8.0

## Architektur

```bash
node tests/place-architecture-regression.test.cjs
node tests/release-version-consistency.test.cjs
```

Browser:

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartung: `ok: true`, vier produktive Contracts, keine Violations.

## Fotospots

- Modul öffnen und sechs erste Ergebnisse prüfen
- Bilder eager geladen
- Favorit setzen und entfernen
- „Alle entfernen“ synchronisiert alle Karten
- Detailkarte zeigt Sonnenmoment, Lichtzeit, Richtung, Motiv, Indoor/Outdoor, Stativ und Zugang
- Datum/Uhrzeit planen
- Dashboard-Tag und Tagespopup zeigen „Fotospot · <Name>“
- Reisewechsel vermischt keine Fotospotdaten
- Dark Mode bleibt lesbar
