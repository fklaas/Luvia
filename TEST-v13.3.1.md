# Testplan – Luvia 13.3.1

## Sichtbarer Test

1. Anmelden und eine Reise mit vollständig aufgelöstem Reiseziel aktivieren.
2. Reise bearbeiten → Module → `Unterkünfte` aktivieren → speichern.
3. `Unterkünfte` in der Navigation öffnen.
4. Nach `Hotel` oder einem konkreten Unterkunftsnamen suchen.
5. Einen Treffer speichern. Er muss unter „Unterkünfte dieser Reise“ erscheinen.
6. `Bearbeiten` öffnen, Status `Gebucht`, Check-in, Check-out, Gäste, Zimmer und Buchungsnummer setzen.
7. `Fester Ausgangspunkt der Reise` aktivieren und speichern.
8. Seite vollständig neu laden. Unterkunft, Status, Buchungsdaten, Check-in/-out und Ausgangspunkt müssen erhalten bleiben.
9. Restaurantmodul öffnen und Suche sowie gespeicherte Restaurants prüfen.

## Developer Console

```js
await LuviaPlaceEntities.health()
await LuviaPlaceEntities.list({type:'accommodation'})
LuviaPlaceRegistry.status('accommodation')
LuviaPlaceCore.diagnostics()
LuviaScheduleIntelligence.snapshot().events.filter(x => x.entityType === 'accommodation')
LuviaTimelineCore.list({type:'accommodation.updated'})
```

Erwartungen:

- Place Health: `ok: true`
- Accommodation Adapter: `state: "ready"`
- Liste: genau eine Trip-Verknüpfung je importierter kanonischer Place-Entity
- wiederholter Import desselben Provider-Ortes: `alreadyAdded: true`
- Schedule enthält Check-in und Check-out
- Timeline enthält `accommodation.updated`

## Fehlerbedeutung

- `AUTH_REQUIRED`: Sitzung fehlt oder ist abgelaufen
- `NOT_AUTHORIZED`: Nutzer ist kein Mitglied der aktiven Reise
- `TRIP_PLACE_NOT_FOUND`: Unterkunft gehört nicht zur angegebenen Reise
- `ACCOMMODATION_UPDATE_FAILED`: SQL-Migration fehlt oder RPC schlug fehl
- `PLACE_IMPORT_FAILED`: Provider-Detail oder generischer Place-Import schlug fehl
