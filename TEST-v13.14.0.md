# Testplan – Luvia 13.14.0 / Core 4.14.0

## Sichtbarer Abnahmetest

1. Places öffnen.
2. Die Kachel **Transport & Mobilität** muss sichtbar sein.
3. Eine Fahrradrouten-Kachel darf nicht mehr erscheinen.
4. Transport öffnen; Shell, Header, Abstände und Karten müssen den übrigen Places entsprechen.
5. Bahn & Fernverkehr, Metro & U-Bahn, Bus & Tram, Flughäfen, Parken, E-Laden und Bike-Sharing testen.
6. Eine Detailkarte öffnen und den Bereich **Verkehrsart, Nutzung und Reiseplanung** prüfen.
7. Einen Mobilitätspunkt favorisieren.
8. Über **Zur Timeline** Datum und Uhrzeit speichern.
9. Den Punkt aus Dashboard oder Tagesablauf öffnen.
10. Nach Reload müssen Favorit, Termin und fachliche Angaben erhalten bleiben.
11. Reise wechseln; Daten der vorherigen Reise dürfen nicht erscheinen.

## Technische Kontrolle

```javascript
LuviaPlaceRegistry.status('mobility')
```

Erwartet wird `state: "ready"`.

```javascript
LuviaPlaceDetail.diagnostics()
```

`capabilityRenderers` muss `mobility` enthalten.

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartet: `ok: true` und `violations: []`.

```javascript
LuviaPlaceRegistry.status('cycling_route')
```

Erwartet: nicht unterstützt beziehungsweise nicht registriert.

## Backend Explorer

Im Backend & Places Explorer die Schaltfläche **Transport testen** verwenden und verschiedene exakte Google-Typen prüfen.

## Automatisierte Abschlussprüfung

Erfolgreich geprüft:

- 13 Regressionstests
- 176 echte JavaScript-/CJS-Dateien syntaktisch geprüft
- 12 TypeScript-Dateien transpiliert
- 37 CSS-Dateien geparst
- 4 JSON-Dateien validiert
- 96 lokale Referenzen aus `index.html` geprüft
- 83 Service-Worker-Shell-Referenzen geprüft

Die historisch falsch benannten Binärdateien `config.js` und `ui.js` werden weiterhin bewusst von der JavaScript-Syntaxprüfung ausgeschlossen.
