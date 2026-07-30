# Testplan – Luvia Build 13.9.1 / Core 4.9.1

## Automatische Tests

Im Projektstamm ausführen:

```bash
node tests/global-place-planning-dialog.test.cjs
node tests/photo-spot-intelligence.test.cjs
node tests/shopping-intelligence.test.cjs
node tests/shopping-place-integration.test.cjs
node tests/place-detail-capability-routing.test.cjs
node tests/place-ui-refinement.test.cjs
node tests/place-architecture-regression.test.cjs
node tests/release-version-consistency.test.cjs
```

## Sichtbarer Haupttest

Für Sehenswürdigkeiten, Fotospots und Shopping jeweils:

1. Place-Modul öffnen.
2. Einen Ort über `Zur Timeline` einplanen.
3. Oberhalb der Suche den geplanten Eintrag suchen.
4. `Datum und Uhrzeit ändern` anklicken.
5. Prüfen, dass der Dialog getrennte Felder für Datum und Uhrzeit verwendet.
6. Einen Wert ändern.
7. Mit Enter speichern.
8. Prüfen, dass kein Browser-Alert erscheint.
9. Prüfen, dass der Eintrag sofort mit dem neuen Datum und der neuen Uhrzeit angezeigt wird.
10. Dashboard öffnen und denselben Wert kontrollieren.
11. Luvia vollständig neu laden und die Cloud-Persistenz kontrollieren.

## Restaurant-Vergleich

1. Restaurant planen.
2. Geplanten Restaurant-Eintrag oberhalb der Suche bearbeiten.
3. Dialog mit Sehenswürdigkeit, Fotospot und Shopping vergleichen.
4. Eingabefelder, Rundungen, Abstände, Buttons und Enter-Verhalten müssen identisch sein.
5. Eine Zeit außerhalb bekannter Öffnungszeiten testen. Die Restaurant-Fachprüfung muss weiterhin eine verständliche Meldung liefern.

## Unterkunftstest

1. Unterkunft öffnen.
2. `Zur Timeline` wählen.
3. Der globale Dialog muss Check-in und Check-out jeweils als getrennte Datum-/Uhrzeitgruppe anzeigen.
4. Beide Werte speichern.
5. Erneut über `Eure Aufenthalte` bearbeiten.
6. Beide Werte müssen erhalten sein und gemeinsam über denselben Cloud-Writer aktualisiert werden.

## Fehlerregression

In der Browser-Konsole dürfen beim Speichern nicht erscheinen:

```text
invalid input syntax for type uuid: "undefined"
400 bei luvia_upsert_trip_place_fields
Unhandled Promise aus dem Place-Planungsdialog
```

Ein absichtlich unvollständiger oder ungültiger Datensatz muss vor dem Netzwerkaufruf eine verständliche Luvia-Meldung erzeugen.

## Insight-Card-Contract

Fotospot und Shopping öffnen und prüfen:

- Insight Cards weiterhin sichtbar,
- Reiseakzentfarbe korrekt,
- Dark Mode korrekt,
- Quelle und Sicherheit lesbar,
- keine eigene abweichende Kartenstruktur.

Developer Console:

```javascript
LuviaPlaceUIContract.forType('photo_spot').insights
LuviaPlaceUIContract.forType('shopping').insights
LuviaPlaceDetail.diagnostics().capabilityRenderers
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

## Service-Diagnose

```javascript
LuviaTimelineCore.diagnostics()
LuviaTripPlaceData.diagnostics()
LuviaPlaceExperience.diagnostics()
LuviaPlaceUIActions.diagnostics()
```

Erwartet werden jeweils `status: "ready"`, eine aktive Trip-ID nach Auswahl einer Reise und keine UUID-/Hydration-Fehler.
