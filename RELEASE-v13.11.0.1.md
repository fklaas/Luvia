# Luvia Build 13.11.0.1 / Core 4.11.0.1

## Cycling Registry Bootstrap & Asset Loading Fix

Dieser Fix behebt den Zustand, in dem `LuviaPlaceRegistry.status('cycling_route')` trotz vorhandener Fahrradrouten-Implementierung `unsupported` und `Kein Adapter registriert` meldete.

## Ursache

Die neuen Fahrradrouten-Dateien waren zwar im Projekt, im Service Worker und in den Architekturtests vorhanden, wurden aber in der produktiven `index.html` nicht ausgeführt:

- `intelligence/cycling-route-service.js` fehlte,
- `core/places/cycling-route-intelligence-service.js` fehlte,
- `modules/cycling-routes/cycling-route-module.js` fehlte,
- `modules/cycling-routes/cycling-route-module.css` fehlte.

Zusätzlich verwendeten sämtliche App-Assets in `index.html` noch den Query-Stand `13.10.0`. Dadurch konnte der Browser je nach Cache-Zustand einen gemischten Runtime-Stand laden: neue Fahrradrouten-Dateien lagen auf dem Server, während Place Domain und Place Adapter noch aus einem alten Release kamen. In diesem alten Adapter-Set existierte `cycling_route` nicht.

## Korrektur

`index.html` lädt jetzt vollständig und in deterministischer Reihenfolge:

1. Places Provider Service
2. Cycling Route Provider Service
3. Universal Place Entity Service
4. Place Domain
5. Place Type Contract und Definitionen
6. Place Registry
7. globale Place Adapter
8. globale Runtime-, Collection-, Timeline- und UI-Services
9. Cycling Route Intelligence
10. Cycling Route Module
11. Places Shell

Die Fahrradrouten-CSS-Datei wird ebenfalls im globalen Head geladen.

Alle lokalen Runtime-Assets in `index.html` verwenden jetzt `?v=13.11.0.1`. Der kritische Inline-Contract-Bootstrap meldet Core `4.11.0.1`.

## PWA-Härtung

Der Service Worker sucht bei JavaScript-, CSS-, JSON- und Manifest-Fallbacks nun ausschließlich im Cache des aktiven Releases:

```javascript
const activeCache = await caches.open(CACHE);
const cached = await activeCache.match(request, { ignoreSearch: true });
```

Damit kann ein Netzwerkfehler nicht mehr versehentlich eine Datei aus einem älteren Luvia-Release zurückgeben.

## Registry-Regressionstest

Neu ist:

```text
tests/cycling-registry-bootstrap.test.cjs
```

Der Test prüft:

- alle vier Fahrradrouten-Browser-Assets,
- aktuelle Asset-Query-Versionen,
- korrekte Script-Reihenfolge,
- vollständige Contract-Registrierung,
- tatsächliche Registrierung des `cycling_route`-Adapters,
- Registry-Status `ready`,
- aktiven Release-Cache statt globalem Cross-Release-Fallback.

## Datenbank und Provider

- Keine neue SQL-Migration in diesem Fix.
- Die Migration aus Build 13.11.0 bleibt weiterhin erforderlich, falls sie noch nicht deployed wurde.
- Keine neuen Secrets.
- Keine neue Fahrradrouten-Fachlogik oder Parallelstruktur.
- Gateway-Deployment nur für konsistente Build-/Core-Anzeige erforderlich.

## Durchgeführte Validierung

- 179 JavaScript-/CJS-Dateien syntaktisch geprüft.
- Die zwei historisch falsch benannten Audio-Dateien `config.js` und `ui.js` korrekt ausgeschlossen.
- 12 Gateway-TypeScript-Dateien mit TypeScript transpiliert.
- 37 CSS-Dateien mit PostCSS geparst.
- 4 JSON-Dateien validiert.
- 97 lokale Referenzen aus `index.html` auf vorhandene Dateien geprüft.
- 15 automatisierte Regressionstests erfolgreich ausgeführt.
- Der neue Runtime-Test erzeugt eine echte Place Registry und bestätigt `cycling_route → ready`.
