# Deployment 13.5.1

1. Projekt deployen.
2. PWA vollständig schließen und erneut öffnen.
3. In der Konsole ausführen:

```js
await LuviaPlaceConformance.runAll()
```

Erwartet werden `ok: true`, `violations: []` sowie grüne Checks für `sharedCards`, `sharedDetails`, `sharedStates`, `sharedActions`, `providerDetails`, `designTokens`, `responsiveConformance` und `visualConformance`.

Backend-Deployment ist nicht erforderlich.
