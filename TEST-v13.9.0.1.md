# Testplan Build 13.9.0.1

## Sichtbarer Abnahmetest für alle Places

Luvia vollständig schließen und neu öffnen. Anschließend jeweils eine Detailkarte öffnen und „Zur Timeline“ testen:

1. Restaurants
2. Unterkünfte
3. Sehenswürdigkeiten
4. Fotospots
5. Shopping

Für jeden Place-Typ gilt:

- Der Datumsdialog öffnet sich genau einmal.
- Es erscheint kein Konsolenfehler zu `register` oder einem fehlenden Timeline-Schema.
- Der Termin wird ohne Reload im geplanten Bereich und im Dashboard-Kalender sichtbar.
- Nach vollständigem Reload bleibt der Termin erhalten.
- Ein Reisewechsel zeigt keine Termine der vorherigen Reise.

Bei Unterkünften müssen Check-in und Check-out erscheinen. Bei den anderen Place-Typen erscheint das jeweils eine kanonische Datumsfeld.

## Konsole

Nicht mehr zulässig:

- `Cannot read properties of undefined (reading 'register')`
- `Für accommodation ist kein Timeline-Schema registriert`
- `Für attraction ist kein Timeline-Schema registriert`
- `Für photo_spot ist kein Timeline-Schema registriert`
- `Für shopping ist kein Timeline-Schema registriert`
- wiederholte `Uncaught (in promise)`-Meldungen beim Timeline-Button

## Technisch

```javascript
await LuviaPlaceTypeDefinitions.ready
LuviaPlaceTypeDefinitions.diagnostics()
```

Erwartet:

```javascript
{
  status: "ready",
  registered: 5,
  lastError: null
}
```

Schemas prüfen:

```javascript
await LuviaPlaceUIActions.ensureSchema('restaurant')
await LuviaPlaceUIActions.ensureSchema('accommodation')
await LuviaPlaceUIActions.ensureSchema('attraction')
await LuviaPlaceUIActions.ensureSchema('photo_spot')
await LuviaPlaceUIActions.ensureSchema('shopping')
```

Alle fünf Aufrufe müssen mindestens ein Timeline-Feld liefern.

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartet:

```javascript
{
  ok: true,
  contracts: 5,
  violations: []
}
```
