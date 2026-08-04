# Test 13.24.0

## Places
- Wunsch: „Ich will vegetarisch essen, am liebsten Nudeln, danach vielleicht ins Kino“.
- Erwartet: getrennte Candidate Sets für Essen und Kino.
- Erwartet: maximal drei kombinierte Planvarianten.
- Kein Krankenhaus, keine Stadt und keine Touristeninformation.

## Move
- Wunsch: „Von der Unterkunft zum Zentrum von Meppen, möglichst entspannt und mit wenig Fußweg“.
- Erwartet: echte Routen, keine POI-Karten.
- Transitkarten zeigen Dauer, Umstiege, Fußweg und – sofern verfügbar – Linienabschnitte.

## Diagnose
```javascript
LuviaPlanningResearch.diagnostics()
LuviaPlanningSession.diagnostics()
```
