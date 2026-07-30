# Testplan Build 13.8.1.1

## Sichtbarer Abnahmetest

### Direkter Fotospot-Aufruf

1. Eine Reise mit aktiviertem Modul `Fotospots` öffnen.
2. Places → Fotospots öffnen.
3. Einen Fotospot aus den Vorschlägen oder Favoriten öffnen.
4. Prüfen, dass die Detailkarte `Fotospot-Lebenszyklus` anzeigt.
5. Unterhalb von `Warum passt das?` muss der Bereich `Licht, Motiv und Zugang` erscheinen.
6. Darin müssen Lichtmoment, beste Lichtzeit, Blickrichtung, Motiv, Aufnahmeort, Stativ und Zugang sichtbar sein.

### Aufruf aus der Timeline

1. Beim Fotospot `Zur Timeline` wählen und Datum sowie Uhrzeit speichern.
2. Zum Dashboard wechseln.
3. Den entsprechenden Tag in der Reise-Timeline öffnen.
4. Beim Fotospot `Place öffnen` wählen.
5. Die Timeline-Ansicht darf nicht zu einem anderen Places-Modul navigieren.
6. Die geöffnete Karte muss erneut `Fotospot-Lebenszyklus` und `Licht, Motiv und Zugang` anzeigen.
7. Der Bereich muss auch nach dem Nachladen der Google-Details sichtbar bleiben.

### Provider-Typ-Sicherheit

Einen Fotospot testen, den Google zugleich als Museum, Park, Platz oder Sehenswürdigkeit klassifiziert. Die Karte muss trotzdem als Fotospot geöffnet werden und darf nicht auf `Aktivitäts-Lebenszyklus` wechseln.

## Developer Console

```javascript
LuviaPlaceDetail.diagnostics()
```

Erwartet:

```javascript
{
  version: "4.8.1.1",
  status: "ready",
  capabilityRenderers: ["photo_spot"],
  ...
}
```

```javascript
LuviaPhotoSpots.version
```

Erwartet:

```text
4.8.1.1
```

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartet:

```javascript
{
  ok: true,
  contracts: 4,
  violations: []
}
```

## Automatische Tests

```bash
node tests/place-detail-capability-routing.test.cjs
node tests/place-ui-refinement.test.cjs
node tests/photo-spot-intelligence.test.cjs
node tests/place-architecture-regression.test.cjs
node tests/release-version-consistency.test.cjs
```
