# Diagnose-Inventar 13.27.5

## Reale Diagnosepfade

- Service Registry: Registrierung, Dependency Order, Startzustand, Tests und Detaildiagnosen.
- Core-4-Diagnostics: Place-, Adapter-, Timeline-, Recommendation-, Cache- und Smoke-Checks.
- Cloud-only Place Verification: read-only Backendprüfung für Place-Daten.
- Developer Console: Event-, Log-, Data-, Platform-, PWA- und Service-Ansichten.
- Neu: `media-readiness` mit standardisiertem Ergebnisformat.

## Festgestellte Schwächen

1. `core-v4-finalization.js` meldet seinen Gesamtsnapshot grundsätzlich als `status: ready`, obwohl Teilchecks fehlen können.
2. Der Service-Registry-Smoke-Test verlangte bisher, dass alle Services `ready` sind; `warning`, `offline`, `planned` und `disabled` werden fachlich nicht sauber differenziert.
3. Adapterdiagnosen enthalten teilweise geplante Place-Typen, die allein durch Registrierung gesund wirken können.
4. Die Developer Console verwendete veraltete 13.20.0-Assetversionen; korrigiert.
5. Produktive Supabase-/Storage-Erreichbarkeit ist nur mit authentifizierter Live-Ausführung belegbar.

## Standardantwort

```json
{
  "service": "media-readiness",
  "version": "4.27.5",
  "status": "active",
  "ok": true,
  "checkedAt": "...",
  "durationMs": 42,
  "dependencies": {},
  "checks": {},
  "failedChecks": [],
  "warnings": []
}
```
