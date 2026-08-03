# Testplan – Luvia Build 13.12.0

## Sichtbarer Funktionstest

1. Eine Reise mit korrekt aufgelöstem Reiseziel öffnen.
2. Places → Fahrradrouten öffnen.
3. „Entdecken“ starten.
4. Noch während OSM-Daten nachladen, müssen erzeugte Rundtouren erscheinen.
5. Die erzeugten Karten müssen sichtbar mit „Für euch erstellt“ gekennzeichnet sein.
6. MTB-Trails wählen und mehrere unterschiedliche MTB-Runden prüfen.
7. Gravel, City, Familie und klassische Radtouren testen.
8. Bei jeder Kategorie müssen erzeugte Touren auch dann verfügbar sein, wenn keine vorhandene OSM-Route gefunden wird.
9. Eine erzeugte Tour öffnen und prüfen:
   - vollständige Routenvorschau,
   - Distanz,
   - Fahrzeit,
   - Rundtour,
   - verfügbare Höhenangaben,
   - Sicherheits- und Providerhinweis.
10. Erzeugte Tour favorisieren.
11. Über „Zur Timeline“ planen.
12. Über den Dashboard-Kalender erneut öffnen.
13. Luvia vollständig neu laden; Favorit, Termin, Geometrie und Providerdaten müssen erhalten bleiben.
14. Reise wechseln; keine Fahrradroutendaten der vorherigen Reise dürfen sichtbar sein.

## Providerkonfiguration

```javascript
await LuviaCyclingRoutes.health()
```

Erwartet wird unter anderem:

```javascript
{
  data: {
    version: '4.12.0',
    configured: true,
    generatedProviderConfigured: true,
    providers: {
      generatedRoundTrips: 'openrouteservice'
    }
  }
}
```

Ist `generatedProviderConfigured` falsch, wurde `OPENROUTESERVICE_API_KEY` noch nicht gesetzt oder der Gateway noch nicht neu deployed.

## Browser-Konsole

```javascript
LuviaCyclingRoutes.diagnostics()
```

Erwartet:

```javascript
{
  version: '4.12.0',
  pipeline: {
    stagedDiscovery: true,
    actions: [
      'cycling.search.generated',
      'cycling.search.routes',
      'cycling.search.trails'
    ],
    generatedRoundTrips: true
  }
}
```

```javascript
LuviaPlaceRegistry.status('cycling_route')
```

Erwartet: `ready: true` und `moduleVisible: true`.

```javascript
LuviaPlaceDetail.diagnostics()
```

Unter `capabilityRenderers` muss `cycling_route` vorhanden sein.

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartet: `ok: true`, sieben produktive Contracts und `violations: []`.

## Automatische Tests

```bash
node tests/cycling-hybrid-engine.test.cjs
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

## Erwartete Fehlerbilder

### `generatedProviderConfigured: false`

Das Supabase-Secret fehlt oder der Gateway wurde nach dem Setzen nicht neu deployed.

### `ORS_API_KEY_MISSING`

Der Gateway kann weder `OPENROUTESERVICE_API_KEY` noch den Kompatibilitätsnamen `ORS_API_KEY` lesen.

### Einzelne erzeugte Route fehlt

Ein Seed oder eine Zielstrecke konnte im lokalen routbaren Wegenetz nicht berechnet werden. Die übrigen Seeds und OSM-Quellen müssen trotzdem Ergebnisse liefern.

### Keine OSM-Tour gefunden

Das ist kein Totalausfall mehr. Die erzeugten Rundtouren müssen weiterhin erscheinen, sofern openrouteservice korrekt konfiguriert ist.
