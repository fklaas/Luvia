# Testplan – Luvia Build 13.11.1

## Sichtbarer UI-Test

1. App vollständig neu öffnen.
2. Build-Anzeige `13.11.1 · Core 4.11.1` prüfen.
3. Places → Fahrradrouten öffnen.
4. Der Modulheader darf keine weiße lokale Innenfläche oder abweichenden Hintergrund besitzen.
5. Schrift, Abstände, Reisefarbe und Containerbreite mit Natur & Ausflüge vergleichen.
6. Die globale Discovery-Shell, Favoritensammlung und Planned-Karte müssen identisch aufgebaut sein.

## Suchperformance

1. `MTB-Trails` anklicken.
2. Der Modulwechsel muss sofort abgeschlossen sein; die Suche darf den Modulaufbau nicht blockieren.
3. Status muss anzeigen, welche Quellen noch laufen.
4. Sobald eine Quelle Ergebnisse liefert, müssen diese sofort erscheinen.
5. Bereits sichtbare Ergebnisse dürfen beim Nachladen nicht verschwinden.
6. Eine zweite Suche starten, bevor die erste fertig ist. Späte Ergebnisse der ersten Suche dürfen die neue Auswahl nicht überschreiben.
7. Dieselbe Suche erneut starten. Der clientseitige Cache soll die Treffer unmittelbar anzeigen.

## Radius und Ergebnisqualität

Nacheinander testen:

- 50 km
- 100 km
- 150 km
- 200 km

Für MTB-Trails prüfen:

- echte MTB-Routen und Trailrelationen werden priorisiert,
- benannte Routen stehen vor generischen Wegsegmenten,
- Entfernung vom Reiseziel beeinflusst die Reihenfolge,
- Modegeschäfte und Shopping-Ergebnisse erscheinen nicht,
- Trailcenter und Bikeparks dürfen ergänzend erscheinen.

Zusätzlich testen:

- Gravel
- City-Touren
- klassische Radtouren
- Familie
- Rundtouren

## Technischer Browser-Test

```javascript
LuviaPlaceRegistry.status('cycling_route')
```

Erwartet `ready: true`.

```javascript
LuviaPlaceExperience.diagnostics()
```

Unter `contracts` muss `canonical-module-shell` enthalten sein.

```javascript
LuviaPlaceUIContract.diagnostics().moduleShell
```

Erwartet:

```javascript
{
  renderer: "LuviaPlaceExperience.moduleShell",
  ...
}
```

```javascript
LuviaCyclingRoutes.diagnostics()
```

Erwartet unter `performance`:

```javascript
{
  searchTimeoutMs: 9500,
  defaultRadiusMeters: 100000,
  maxRadiusMeters: 200000
}
```

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartet:

```javascript
{
  ok: true,
  contracts: 7,
  violations: []
}
```

## Automatische Tests

```bash
node tests/cycling-provider-gateway.test.cjs
node tests/cycling-registry-bootstrap.test.cjs
node tests/cycling-route-integration.test.cjs
node tests/cycling-route-intelligence.test.cjs
node tests/cycling-search-performance.test.cjs
node tests/place-architecture-regression.test.cjs
node tests/place-contract-bootstrap-resilience.test.cjs
node tests/release-version-consistency.test.cjs
```
