# Luvia 13.2.0.2 – Universal Place Verification & Backend Stabilization

Core 4.2.0.2 stabilisiert die Cloud-Verifikation des universellen Place-Systems.

## Behoben
- PostgREST-GRANTs und RLS-Verträge für `timeline_events` und `place_visits`.
- Read-only Backend-Verifikations-RPC für eine aktive Reise.
- Cloud-Only-Verifikation wird auch auf der Core-Diagnoseseite geladen.
- Verifikation wartet deterministisch auf die Core-Services.
- `hydrateVisits()` ist als öffentliche Core-API verfügbar.
- Öffentliche Gateway-Healthchecks funktionieren auch bei einem abgelaufenen Browser-Token.
- Backend-Client wiederholt öffentliche Healthchecks notfalls anonym.
- Cache-Busting und Service-Worker-Version auf Build 13.2.0.2 erhöht.

## Verifikation
```js
await LuviaCloudOnlyPlaceVerification.run({ rehydrate: true })
```

Erwartet: `passed: true`, `error: null` und ein gefülltes `backend`-Objekt.
