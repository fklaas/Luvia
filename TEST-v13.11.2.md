# Testplan – Luvia Build 13.11.2

## Sichtbarer Funktionstest

- Fahrradrouten öffnen: Shell und Suche erscheinen sofort.
- Entdecken: Routenrelationen, Trailgebiete und Startpunkte werden unabhängig voneinander ergänzt.
- MTB-Trails: 200-km-Radius wird vorgeschlagen.
- Keine exakten MTB-Treffer: transparente Alternativen statt leerer Liste.
- Trailgebiet öffnen: Hinweis, dass es keine vollständige Tour ist.
- Ausgeschilderte Route öffnen: Details und Geometrie werden bei Bedarf nachgeladen.
- Favorit und Timeline testen.
- Reise wechseln und strikte Reiseisolation kontrollieren.

## Browser-Konsole

```javascript
LuviaCyclingRoutes.diagnostics()
```

Erwartet unter anderem:

```javascript
{
  version: '4.11.2',
  pipeline: {
    stagedDiscovery: true,
    actions: ['cycling.search.routes', 'cycling.search.trails'],
    broadenWhenExactEmpty: true,
    unnamedTrailClustering: true
  },
  performance: {
    defaultRadiusMeters: 150000,
    recommendedMtbRadiusMeters: 200000,
    maxRadiusMeters: 300000
  }
}
```

```javascript
LuviaPlaceRegistry.status('cycling_route')
```

Erwartet: `ready: true` und `moduleVisible: true`.

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartet: `ok: true`, sieben Contracts und keine Violations.

## Automatische Tests

```bash
node tests/cycling-discovery-rebuild.test.cjs
node tests/cycling-discovery-runtime.test.cjs
node tests/cycling-provider-gateway.test.cjs
node tests/cycling-search-performance.test.cjs
node tests/cycling-route-integration.test.cjs
node tests/cycling-route-intelligence.test.cjs
node tests/cycling-registry-bootstrap.test.cjs
node tests/place-architecture-regression.test.cjs
node tests/release-version-consistency.test.cjs
```
