# Testplan Build 13.9.0

## Sichtbarer Abnahmetest

### Shopping öffnen und suchen

1. Eine Reise mit vollständig aufgelöstem Reiseziel aktivieren.
2. In der unteren Navigation `Places` öffnen.
3. Im Places-Hub muss die neue Kachel `Shopping` erscheinen.
4. Shopping öffnen.
5. Nacheinander mindestens zwei Kategorien testen, beispielsweise `Märkte` und `Souvenirs`.
6. Die Ergebnisse müssen zum aktiven Reiseziel gehören und dieselbe globale Kartenstruktur wie Restaurants, Unterkünfte, Sehenswürdigkeiten und Fotospots verwenden.
7. Mit `Weitere Orte anzeigen` müssen jeweils weitere Ergebnisse ohne kompletten Modulreload erscheinen.

### Shopping Intelligence und Detailkarte

1. Eine Vorschlagskarte öffnen.
2. Die Karte muss `Shopping-Lebenszyklus` anzeigen.
3. Unterhalb der allgemeinen Empfehlung muss der Bereich `Sortiment, Erlebnis und Reiseeignung` erscheinen.
4. Sichtbar sein müssen, soweit ableitbar:
   - Einkaufsformat
   - Sortiment
   - Einkaufserlebnis
   - beste Besuchszeit
   - Indoor oder Outdoor
   - Preisgefühl
   - lokaler Charakter
5. Quelle und Sicherheit müssen lesbar sein.
6. Website, Telefon, Google Maps, Bewertung, Status und weitere verfügbare Google-Details müssen im globalen Providerbereich erscheinen.
7. Eine Alternative anklicken. Sie muss ohne Seitenreload ihre eigene Shopping-Detailkarte öffnen.

### Favoriten und Cloud-Persistenz

1. Einen Shopping-Ort als Favorit markieren.
2. Er muss unmittelbar in `Lieblings-Shoppingorte` erscheinen.
3. Dieselbe Vorschlagskarte muss sofort den aktiven Favoritenstatus zeigen.
4. Luvia vollständig neu laden.
5. Der Favorit und die Shopping-Einordnung müssen weiterhin vorhanden sein.
6. Favorit erneut anklicken und entfernen.
7. Vorschlags- und Favoritenbereich müssen sich ohne Reload synchronisieren.
8. `Alle entfernen` mit mehreren Shopping-Favoriten testen.

### Timeline

1. Bei einem Shopping-Ort `Zur Timeline` wählen.
2. Datum und Uhrzeit innerhalb der Reise setzen.
3. Speichern.
4. Der Eintrag muss sofort unter `Eure Shopping-Momente` erscheinen.
5. Zum Dashboard wechseln und den Tag im Timeline-Kalender öffnen.
6. Der Eintrag muss als `Shopping · <Name>` erscheinen.
7. `Place öffnen` muss dieselbe vollständige Shopping-Detailkarte öffnen, ohne das Dashboard beziehungsweise Timeline-Popup unerwartet zu verlassen.
8. Datum und Uhrzeit ändern und prüfen, dass Shopping-Modul und Dashboard ohne Reload aktualisiert werden.
9. Luvia neu laden; der Termin muss erhalten bleiben.

### Reiseisolation

1. Eine zweite Reise aktivieren.
2. Shopping öffnen.
3. Favoriten und Timeline-Daten der vorherigen Reise dürfen nicht sichtbar sein.
4. Zur ersten Reise zurückwechseln.
5. Deren Daten müssen wieder vollständig aus der Cloud erscheinen.

## Backend & Places Explorer

1. `intelligence/backend.html` öffnen.
2. `Places Explorer` wählen.
3. `Shopping testen` anklicken.
4. Die Suche darf nicht nur Einkaufszentren liefern, sondern kann abhängig vom Ziel auch Märkte, Boutiquen, Souvenir- oder Feinkostorte enthalten.
5. Einen Treffer über `Zur Reise hinzufügen` importieren.
6. Es darf kein Signatur-, 400-, 401-, CORS- oder `PLACE_EXTENSION_PERSIST_FAILED`-Fehler entstehen.

## Developer Console

```javascript
LuviaPlaceRegistry.status('shopping')
```

Erwartet:

```javascript
{
  state: "ready",
  ready: true,
  moduleVisible: true,
  ...
}
```

```javascript
LuviaPlaceTypeContracts.get('shopping')
```

Erwartet werden unter anderem `planned_at`, die Shopping-Capabilities und die globale Detailkonfiguration.

```javascript
LuviaShoppingIntelligence.version
```

Erwartet:

```text
4.9.0
```

```javascript
LuviaPlaceDetail.diagnostics()
```

`capabilityRenderers` muss mindestens `photo_spot` und `shopping` enthalten.

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

Nach Favorit und Timeline-Planung:

```javascript
LuviaTripPlaceData.recordsForType('shopping')
```

Erwartet wird mindestens ein cloudseitiger Datensatz mit `place_type: "shopping"`. Nach einer Planung enthält `fields` außerdem `planned_at`.

## Automatische Tests

```bash
node tests/shopping-intelligence.test.cjs
node tests/shopping-place-integration.test.cjs
node tests/photo-spot-intelligence.test.cjs
node tests/place-architecture-regression.test.cjs
node tests/place-detail-capability-routing.test.cjs
node tests/place-ui-refinement.test.cjs
node tests/release-version-consistency.test.cjs
```
