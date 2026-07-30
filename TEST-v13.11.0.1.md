# Testplan – Luvia Build 13.11.0.1

## Reproduzierter Ausgangsfehler

```javascript
LuviaPlaceRegistry.status('cycling_route')
```

lieferte:

```javascript
{
  state: "unsupported",
  reason: "Kein Adapter registriert."
}
```

## Sichtbarer Test

1. App nach `force-update.html` vollständig neu öffnen.
2. Links unten muss Build `13.11.0.1 · Core 4.11.0.1` erscheinen.
3. Places öffnen.
4. Die Kachel `Fahrradrouten` muss sichtbar und anklickbar sein.
5. Der Bereich muss im globalen Places-Design laden.
6. `MTB-Trails` wählen und eine Suche starten.
7. Eine Route öffnen.
8. `Strecke, Trail und Fahrprofil` muss sichtbar sein.
9. Favorit und `Zur Timeline` testen.
10. Nach Reload müssen Favorit und Termin erhalten bleiben.

## Technischer Browser-Test

```javascript
LuviaPlaceRegistry.status('cycling_route')
```

Erwartet `state: "ready"` und `ready: true`.

```javascript
LuviaPlaceRegistry.getAdapter('cycling_route')
```

Erwartet ein Adapterobjekt mit `normalize`, `status`, `load`, `search` und `import`.

```javascript
LuviaPlaceRegistry.diagnostics()
```

Unter `adapters` muss `cycling_route` mit `state: "ready"` stehen.

```javascript
LuviaPlaceTypeContracts.get('cycling_route')
```

Erwartet den vollständigen Fahrradrouten-Contract mit `planned_at`.

```javascript
LuviaPlaceUIActions.schema('cycling_route')
```

Erwartet ein Timeline-Schema mit dem Feld `planned_at`.

## Automatische Tests

```bash
node tests/cycling-registry-bootstrap.test.cjs
node tests/cycling-route-integration.test.cjs
node tests/cycling-route-intelligence.test.cjs
node tests/place-architecture-regression.test.cjs
node tests/place-contract-bootstrap-resilience.test.cjs
node tests/release-version-consistency.test.cjs
```

Alle Tests müssen ohne Fehler enden.

## Cache-Prüfung

In DevTools → Application → Cache Storage darf nach Aktivierung nur der aktuelle Luvia-App-Shell-Cache maßgeblich sein:

```text
luvia-shell-v13.11.0.1
```

Die produktive `index.html` darf keine Asset-Referenz mit `?v=13.10.0` enthalten.

## Statische Abschlussvalidierung

- JavaScript/CJS: 179 Dateien erfolgreich.
- TypeScript-Transpilation: 12 Dateien erfolgreich.
- CSS-Parsing: 37 Dateien erfolgreich.
- JSON-Validierung: 4 Dateien erfolgreich.
- Lokale `index.html`-Referenzen: 97 geprüft, keine fehlt.
- Automatische Tests: 15 erfolgreich.
