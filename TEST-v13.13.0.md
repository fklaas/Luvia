# Testplan – Luvia Build 13.13.0

## Automatisierte Tests

```bash
for test in tests/*.cjs; do node "$test"; done
```

Besonders relevant:

```bash
node tests/cycling-discovery-runtime.test.cjs
node tests/cycling-discovery-rebuild.test.cjs
node tests/cycling-hybrid-engine.test.cjs
node tests/cycling-search-performance.test.cjs
node tests/cycling-registry-bootstrap.test.cjs
```

## Sichtbare Abnahme

1. Eine Reise mit korrekt aufgelöstem Reiseziel öffnen.
2. Places → Fahrradrouten öffnen.
3. Ohne Trailforks- und openrouteservice-Secrets testen.
4. Innerhalb weniger Sekunden müssen Google-generierte Routen oder mindestens Google-Tourziele erscheinen.
5. MTB, Gravel, City-Touren, Radtouren und Familie nacheinander testen.
6. Google-Routen müssen als „Für euch erstellt“ gekennzeichnet sein.
7. Jede vollständige Route muss Distanz, Fahrzeit und Routenvorschau besitzen.
8. MTB und Gravel dürfen keine erfundene MTB-Skala, Oberfläche oder Höhenmeter anzeigen.
9. Einen Treffer favorisieren und zur Timeline hinzufügen.
10. Den Treffer aus dem Dashboard erneut öffnen.
11. Nach Reload müssen Favorit, Planung und Routendaten erhalten bleiben.
12. Nach Reisewechsel dürfen keine Daten der vorherigen Reise sichtbar sein.

## Fehlerdiagnose

Wenn `data.google.providers.routes` in `cycling.health` false ist, fehlt ein Google-Key. Ist der Wert true, aber `cycling.search.google` meldet einen Berechtigungsfehler, muss die Routes API im Google-Cloud-Projekt aktiviert beziehungsweise in den API-Einschränkungen des Keys zugelassen werden.

## Erwartete Runtime-Diagnose

```javascript
LuviaCyclingRoutes.diagnostics()
```

Erwartet:

- `version: "4.13.0"`
- `pipeline.googlePrimary: true`
- Action `cycling.search.google`
- `defaultRadiusMeters: 150000`
- `maxRadiusMeters: 300000`

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
