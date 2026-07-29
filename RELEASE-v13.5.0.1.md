# Luvia Build 13.5.0.1 — Place Conformance Closure

## Ziel
Die zwei vom ersten Place-Type-Conformance-Lauf gefundenen Verstöße werden nicht ausgeblendet, sondern im gemeinsamen Core beseitigt.

## Änderungen
- Der universelle Detail-Service exportiert nun den verbindlichen globalen Namen `LuviaPlaceDetails`.
- `LuviaPlaceDetail` bleibt als kompatibler Alias auf exakt dieselbe eingefrorene Serviceinstanz erhalten.
- Das Restaurantmodul verwendet ausschließlich kanonische Lifecycle-Werte aus dem Restaurant-Contract.
- Der nicht kanonische Status `favorited` wurde aus dem aktiven Restaurantmodul entfernt.
- Die Lifecycle-Reihenfolge wird aus `LuviaPlaceTypeContracts` bezogen.
- Der Source-Guard setzt reguläre Ausdrücke vor jeder Prüfung zuverlässig zurück.
- `LuviaTripPlaceData` ist nun ebenfalls ein verpflichtender Runtime-Bestandteil der Conformance-Prüfung.

## Erwartetes Ergebnis
`await LuviaPlaceConformance.runAll()` liefert nach vollständig geladenem Frontend:

```js
{
  version: '4.5.0.1',
  ok: true,
  contracts: 3,
  violations: [],
  checks: {
    contracts: true,
    sharedShell: true,
    sharedCollections: true,
    sharedDetails: true,
    timeline: true,
    intelligence: true,
    cloudAuthoritative: true,
    sourceGuard: true
  }
}
```
