# Luvia 11.2.1 · Core 3.0.2.1 — PWA Root & Developer Start Fix

## Behoben

- Service Worker wird unabhängig von der geöffneten Seite immer aus der App-Wurzel geladen.
- Aufrufe aus `/intelligence/` registrieren nicht länger fälschlich `/intelligence/sw.js`.
- Falsch registrierte Service Worker mit abweichendem Scope werden entfernt.
- PWA-Selbsttest unterstützt relative Manifest-Pfade und prüft den tatsächlichen App-Scope.
- Developer-Service startet nach erfolgreichem PWA-Service automatisch und wechselt von „Registriert“ auf „Bereit“.
- Cache auf `luvia-shell-v11.2.1` erhöht.

## Ursache

`document.baseURI` zeigte in der Developer Console auf `/intelligence/`. Dadurch wurde der Service Worker unter `/intelligence/sw.js` gesucht, obwohl er in der App-Wurzel liegt.
