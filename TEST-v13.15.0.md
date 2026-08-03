# Testplan – Luvia 13.15.0 / Core 4.15.0

## Hauptnavigation

1. Eine Reise öffnen.
2. Unten müssen **Dashboard**, **Places** und **Move** erscheinen.
3. Places öffnen.
4. Die Places-Übersicht muss genau sechs Entdeckungsbereiche enthalten.
5. Eine Transport- oder Mobilitätskachel darf dort nicht mehr erscheinen.
6. Move öffnen.
7. Die Move-Übersicht muss dieselbe visuelle Kachel-Sprache wie Places verwenden.

## Move-Übersicht

Unter **An- & Abreise** müssen erscheinen:

- Flüge
- Bahn
- Bus & Fernbus
- Fähren

Unter **Vor Ort** müssen erscheinen:

- Nahverkehr
- Taxi & Fahrdienste
- Vermietung
- Parken & Laden

Jede Kachel muss mit „Zurück zur Move-Auswahl“ wieder zur eigenen Übersicht führen.

## Suchqualität

1. Bahn öffnen und Haupt-, Fern- sowie Regionalbahnhöfe prüfen.
2. Bus & Fernbus öffnen. Straßennamen oder sehr kurze Haltestellennamen müssen durch den Zusatz `· Bus` verständlich werden.
3. Fähren öffnen. Flughäfen dürfen dort niemals erscheinen.
4. Flüge öffnen. Bus-, Bahn- oder Fährtreffer dürfen dort nicht erscheinen.
5. Nahverkehr öffnen und Metro, Stadtbahn, Straßenbahn sowie Bus prüfen.
6. Parken & Laden öffnen und zwischen Parkhaus, Parkplatz, P+R und Ladestation unterscheiden.
7. Bei leeren Kategorien muss Move einen ehrlichen Leerzustand zeigen und keine fachfremden Ersatztreffer einmischen.

## Entfernung

Die Distanz auf den Suchkarten muss sich auf das aktive Reiseziel beziehungsweise den Zielanker beziehen. Sie darf nicht beim Rendern durch die aktuelle Geräteposition überschrieben werden.

## Detail, Favorit und Timeline

1. Einen Move-Treffer öffnen.
2. Der Bereich **Verkehrsart, Nutzung und Reiseplanung** muss erscheinen.
3. Treffer als Favorit speichern.
4. Über **Zur Timeline** einplanen.
5. Über Dashboard oder Tagesablauf erneut öffnen.
6. Nach Reload müssen Favorit, Termin und fachliche Felder erhalten bleiben.
7. Nach Reisewechsel dürfen keine Daten der vorherigen Reise sichtbar sein.

## Technische Kontrolle

```javascript
LuviaPlaceRegistry.status('mobility')
```

Erwartet: `state: "ready"` und `moduleVisible: true`.

```javascript
LuviaModuleRegistry.domains
```

Erwartet:

```javascript
{
  places: ['accommodations','restaurants','attractions','photo_spots','shopping','nature'],
  move: ['mobility']
}
```

```javascript
LuviaMoveShell.tiles()
```

Erwartet werden acht Move-Kacheln.

```javascript
LuviaMobility.searchPlans()
```

Die Ausgabe muss getrennte Typpläne für Flughäfen, Bahn, Bus/Fernbus, Fähren, Nahverkehr, Taxi, Vermietung sowie Parken/Laden enthalten.

```javascript
LuviaPlaceDetail.diagnostics()
```

`capabilityRenderers` muss `mobility` enthalten.

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartet: `ok: true` und `violations: []`.

## Automatisierte Abschlussprüfung

Erfolgreich geprüft:

- 14 Regressionstests
- 178 echte JavaScript-/CJS-Dateien syntaktisch geprüft
- 12 TypeScript-Dateien transpiliert
- 38 CSS-Dateien geparst
- 4 JSON-Dateien validiert
- 98 lokale Referenzen aus `index.html` geprüft
- 85 Service-Worker-Shell-Referenzen geprüft

Die historisch falsch benannten Binärdateien `config.js` und `ui.js` werden weiterhin bewusst von der JavaScript-Syntaxprüfung ausgeschlossen.
