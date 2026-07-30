# Luvia Build 13.9.1.1 / Core 4.9.1.1

## Place Contract Bootstrap & Offline Timeline Resilience

Dieser Hotfix behebt den Ladefehler, durch den `place-type-contract.js` zeitweise mit HTTP 503 ausfiel. In diesem Zustand versuchte `place-type-definitions.js` anschließend unmittelbar `register` auf einem nicht vorhandenen Contract-Core aufzurufen. Shopping wurde dadurch ohne sein Feld `planned_at` registriert und der globale Planungsdialog meldete: `Für shopping ist kein Timeline-Schema registriert.`

## Behobene Ursache

Die Script-Reihenfolge in `index.html` war korrekt. Der Service Worker hielt den Place-Type-Contract und mehrere unmittelbar davon abhängige Place-Core-Dateien jedoch nicht in seiner kritischen App Shell. Außerdem suchte der Fallback nur nach der vollständigen versionierten Request-URL. Eine gecachte Datei ohne `?v=...` wurde deshalb nicht gefunden.

Eine kurzzeitige Netzwerk- oder Deployment-Störung konnte so folgende Kette auslösen:

1. `place-type-contract.js` liefert 503.
2. `place-type-definitions.js` greift auf `undefined.register` zu.
3. Shopping, Fotospots und andere typabhängige Contracts fehlen.
4. `LuviaPlaceUIActions.schema('shopping')` liefert keine Felder.
5. `Zur Timeline` kann keinen globalen Planungsdialog öffnen.

## Robuster Contract-Bootstrap

- Der Contract-Core sendet nach erfolgreicher Initialisierung `luvia:place-contract-ready`.
- Mehrfaches Nachladen derselben Core-Version ist idempotent und leert keine bereits registrierten Contracts.
- Die Definitionen prüfen die Contract-API vor jeder Registrierung.
- Bei fehlendem Contract wird die Datei begrenzt erneut geladen, ohne einen ungefangenen TypeError auszulösen.
- Nach vollständiger Registrierung wird `luvia:place-definitions-ready` ausgelöst.
- Die Place Registry aktualisiert nachträglich registrierte Typen automatisch und übernimmt deren echte Capabilities und Felder.

## Globaler Timeline-Dialog

`LuviaPlaceUIActions.openTimelineDialog(...)` wartet nun bei einem vorübergehenden Bootstrap-Zustand bis zu vier Sekunden auf das typabhängige Timeline-Schema. Erst wenn der Contract danach weiterhin fehlt, erscheint eine verständliche Fehlermeldung.
Mehrfaches Klicken auf denselben Timeline-Button während dieser kurzen Wiederherstellung wird zentral dedupliziert. Dadurch öffnen sich anschließend keine übereinanderliegenden Dialoge und es entstehen keine wiederholten ungefangenen Promise-Fehler.

Shopping verwendet weiterhin ausschließlich das zentrale Feld:

```text
planned_at
```

Es wurde kein lokales Shopping-Schema und kein zweiter Timeline-Writer eingeführt.

## Service-Worker-Härtung

Die kritische App Shell enthält jetzt zusätzlich unter anderem:

- Place Type Contract
- Place Type Definitions
- Place Entity Service
- Timeline Core
- Place UI Contract
- Place UI Actions
- Place UI States
- Place Conformance

Bei JavaScript, CSS, JSON und Manifest-Dateien gilt jetzt:

- Netzwerk bleibt bevorzugt.
- Erfolgreiche Antworten werden aktualisiert gecacht.
- Bei HTTP-Fehler oder Netzwerkfehler wird eine vorhandene Cache-Kopie verwendet.
- Query-Strings der Build-Version verhindern den Cache-Fallback nicht mehr.

## Datenbank und Provider

- Keine SQL-Migration.
- Keine neue Tabelle.
- Keine neuen Secrets.
- Keine Änderung am fachlichen Google-Places-Vertrag.
- Edge Function nur wegen Build-/Core-Version erneut deployen.
