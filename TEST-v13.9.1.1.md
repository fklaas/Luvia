# Testplan – Build 13.9.1.1

## Sichtbar

- Shopping, Fotospots und Sehenswürdigkeiten öffnen.
- Jeweils `Zur Timeline` aus der Detailkarte verwenden.
- Datum und Uhrzeit mit Button und Enter speichern.
- Geplante Karte, Dashboard und Timeline müssen sich ohne Reload aktualisieren.
- Nach Reload müssen die Termine erhalten bleiben.

## Konsole

```javascript
LuviaPlaceTypeContracts.diagnostics()
```

Erwartet: mindestens fünf registrierte produktive Contracts und `shopping` mit `planned_at`.

```javascript
LuviaPlaceUIActions.schema('shopping')
```

Erwartet: ein Feld mit `key: "planned_at"` und `timelineRole: "point"`.

```javascript
LuviaPlaceRegistry.getType('shopping')
```

Erwartet: `contractVersion: "4.9.1.1"` und aktive Planning-/Timeline-Capabilities.

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartet: `ok: true`, fünf Contracts, keine Violations.

## Offline-/Cache-Regression

- `place-type-contract.js`, `place-type-definitions.js`, `timeline-core.js` und `place-ui-actions.js` gehören zur App Shell.
- Versionierte Requests verwenden bei Netzwerkfehlern den Cache mit `ignoreSearch`.
- Definitionen dürfen ohne vorhandenen Contract keinen synchronen TypeError auslösen.
