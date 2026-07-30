# Testplan 13.7.0 – Global Place Runtime & Conformance Closure

## Automatisch

```bash
node tests/place-architecture-regression.test.cjs
```

Erwartet: `Place architecture static regression: OK`.

In der Browser-Konsole:

```js
await LuviaPlaceConformance.runAll()
```

Erwartet: `ok: true`, `singleRuntime: true`, `singleCommands: true`.

## Funktional je Place-Typ

Für Restaurant, Unterkunft und Sehenswürdigkeit:

1. Favorit auf Discovery-Karte setzen.
2. Prüfen, dass Sammlung, Discovery-Karte und Detailkarte sofort denselben Zustand zeigen.
3. Aktiven Favoriten erneut anklicken und Entfernung überall prüfen.
4. Drei Favoriten setzen und „Alle entfernen“ ausführen.
5. Reload: Cloud-Zustand muss erhalten bleiben.
6. Place zur Timeline hinzufügen, ändern und entfernen.
7. Reise wechseln: keine Daten der vorherigen Reise dürfen sichtbar bleiben.

## UI

- Light Mode und Dark Mode
- gleiche Shell, Cards, Planned Panels, Favoritenpanels, Detailaktionen und Planungspopups
- Reiseakzent auf Favorit und „Zur Timeline“
