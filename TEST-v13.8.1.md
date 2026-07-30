# Testplan Build 13.8.1

## Sichtbarer Test

1. Eine Reise aktivieren, in der Restaurants, Unterkünfte, Sehenswürdigkeiten und Fotospots eingeschaltet sind.
2. Den Navigationspunkt `Places` öffnen.
3. Auf einer breiten Web-Ansicht prüfen:
   - maximal drei Kacheln pro Zeile
   - vierte Kachel in der nächsten Zeile
   - keine abgeschnittenen Texte oder Tags
   - Reise-Akzentfarbe und Dark Mode korrekt
4. Fenster auf Tabletbreite verkleinern: zwei Spalten müssen erscheinen.
5. Mobile Breite prüfen: eine Spalte, vollständige Lesbarkeit und keine horizontalen Überläufe.
6. `Fotospots` öffnen und eine Detailkarte laden.
7. Im Abschnitt `Licht, Motiv und Zugang` prüfen:
   - großzügige Insight Cards
   - Lichtmoment und beste Lichtzeit hervorgehoben
   - Quelle und Sicherheit getrennt lesbar
   - Zugang als breite Abschlusskarte
   - auf Mobilgeräten eine Spalte
8. Favorit und `Zur Timeline` testen. Beide Funktionen müssen unverändert arbeiten.

## Technischer Test

```bash
node tests/photo-spot-intelligence.test.cjs
node tests/place-architecture-regression.test.cjs
node tests/release-version-consistency.test.cjs
```

Browser-Konsole:

```javascript
LuviaPlaceUI.diagnostics()
await LuviaPlaceConformance.runAll()
```

Erwartung:

- `LuviaPlaceUI.diagnostics().components` enthält `insightGrid`
- Conformance liefert `ok: true`
- keine Violations
- vier produktive Place-Contracts

Zusätzlicher statischer UI-Vertrag:

```bash
node tests/place-ui-refinement.test.cjs
```
