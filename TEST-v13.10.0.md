# Testplan – Build 13.10.0

## Sichtbarer Test
1. Eine Reise mit aufgelöstem Reiseziel öffnen.
2. Places öffnen; die Kachel **Natur & Ausflüge** muss erscheinen.
3. Kategorien Parks & Gärten, Wandern, Aussicht und Naturreservate testen.
4. Eine Detailkarte öffnen; **Landschaft, Aufwand und Ausflugseignung** muss sichtbar sein.
5. Naturort favorisieren; Favorit muss sofort in der Sammlung erscheinen.
6. Über **Zur Timeline** Datum und Uhrzeit speichern.
7. Dashboard-Tag öffnen und den Naturort aus der Timeline aufrufen.
8. Vollständig neu laden: Favorit, Timeline und gespeicherte Einordnung müssen erhalten bleiben.
9. Reise wechseln: Keine Naturdaten der vorherigen Reise dürfen sichtbar bleiben.

## Technische Tests
```js
LuviaPlaceRegistry.status('nature')
LuviaPlaceDetail.diagnostics()
await LuviaPlaceConformance.runAll()
```

Erwartet: Nature Adapter `ready`, Capability-Renderer `nature`, sechs Contracts und keine Violations.

## Automatisiert
- Nature Intelligence
- Nature Place Integration
- Place Architecture Regression
- Place Contract Bootstrap Resilience
- Global Place Planning Dialog
- Photo Spot Intelligence
- Shopping Intelligence
- Release Version Consistency
