# Regressionstest · Luvia 13.6.5 / Core 4.6.5

## Sehenswürdigkeit planen

1. Places → Sehenswürdigkeiten öffnen.
2. Eine Detailkarte öffnen.
3. „Zur Timeline“ wählen.
4. Datum und Uhrzeit eintragen.
5. „In den Tagesplan“ wählen.
6. Erwartung: kein HTTP 400 auf `trip_place_fields`.
7. Erwartung: Dialog schließt, Erfolgsmeldung erscheint.
8. Erwartung: Sehenswürdigkeit erscheint sofort im Modul und Dashboard-Kalender.

## Restaurantfavoriten gesammelt entfernen

1. Places → Restaurants öffnen.
2. Favoritensammlung aufklappen.
3. „Alle entfernen“ wählen.
4. Erwartung: alle Restaurantfavoriten werden aus der Sammlung entfernt.
5. Erwartung: Karten und Zähler aktualisieren sich ohne Reload.

## Andere Place-Typen

- Unterkunft zur Timeline hinzufügen.
- Restaurant zur Timeline hinzufügen.
- Favoriten bei Unterkunft und Sehenswürdigkeit gesammelt entfernen.
- Reise wechseln und prüfen, dass ausschließlich Daten der aktiven Reise erscheinen.

## Conformance

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartung: `ok: true` und keine Verletzung der kanonischen Collection- oder Timeline-Verträge.
