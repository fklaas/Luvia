# Testplan – Build 13.9.1.2

## Sichtbarer All-Place-Test

Für Restaurant, Unterkunft, Sehenswürdigkeit, Fotospot und Shopping jeweils:

1. Detailkarte öffnen.
2. `Zur Timeline` anklicken.
3. Datum und Uhrzeit eingeben.
4. Mit Enter speichern.
5. Geplante Karte oberhalb der Suche prüfen.
6. Dashboard-Kalender prüfen.
7. Termin erneut ändern.
8. App neu laden und Persistenz prüfen.

Bei Unterkünften müssen Check-in und Check-out erscheinen. Alle anderen Typen erhalten genau ihr kanonisches Point-Feld.

## Konsole

```javascript
LuviaPlaceTypeContracts.diagnostics()
```

Erwartet nach normalem Laden:

- `version: "4.9.1.2"`
- `bootstrap: false` beziehungsweise vollständiger Core
- mindestens fünf produktive Contracts

Bei einer absichtlich simulierten kurzzeitigen Störung darf vorübergehend `degraded-ready` erscheinen; die Timeline-Schemata müssen trotzdem vorhanden sein.

```javascript
['restaurant','accommodation','attraction','photo_spot','shopping'].map(type => ({
  type,
  fields: LuviaPlaceUIActions.schema(type)
}))
```

Erwartet: Für jeden Typ mindestens ein Timeline-Feld.

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartet: `ok: true`, fünf produktive Contracts, keine Violations.

## Automatisierte Regression

```bash
node tests/place-contract-bootstrap-resilience.test.cjs
node tests/global-place-planning-dialog.test.cjs
node tests/place-architecture-regression.test.cjs
node tests/release-version-consistency.test.cjs
```
