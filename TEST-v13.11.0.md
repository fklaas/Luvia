# Testplan – Build 13.11.0 / Core 4.11.0

## Sichtbarer Abnahmetest

1. Eine Reise mit korrekt aufgelöstem Reiseziel öffnen.
2. **Places** aufrufen. Die Kachel **Fahrradrouten** muss sichtbar sein.
3. Fahrradrouten öffnen. Standardmäßig soll die MTB-orientierte Entdeckung starten.
4. Nacheinander **MTB-Trails**, **Gravel**, **City-Touren**, **Radtouren**, **Bikeparks** und **Rundtouren** testen.
5. Den Radius zwischen 30 km, 50 km und 80 km wechseln.
6. Eine echte OSM-Route öffnen. Die Detailkarte muss den Abschnitt **Strecke, Trail und Fahrprofil** zeigen.
7. Prüfen, dass Quelle und Sicherheit für Schwierigkeit, Untergrund, Länge und Höhenprofil sichtbar sind.
8. Eine Route als Favorit markieren. Sie muss ohne Reload in **Lieblingsrouten** erscheinen.
9. Über **Zur Timeline** Datum und Uhrzeit speichern.
10. Im Dashboard den betreffenden Tag öffnen und die Fahrradtour anklicken.
11. Die vollständige Fahrradrouten-Detailkarte muss sich im Timeline-Kontext öffnen.
12. Luvia vollständig neu laden. Favorit, Termin und gespeicherte Routeneinordnung müssen erhalten bleiben.
13. Die Reise wechseln. Fahrradrouten der vorherigen Reise dürfen nicht sichtbar bleiben.

## MTB-spezifische Prüfung

Bei einer Route mit vorhandener `mtb:scale` muss die echte Stufe, beispielsweise `S1` oder `S2`, angezeigt werden. Fehlt die Quelle, muss stattdessen eine klare Formulierung wie **MTB-Schwierigkeit vor Ort prüfen** erscheinen; Luvia darf keine Stufe erfinden.

Die Routenvorschau soll den vorhandenen Geometrieverlauf darstellen. Bei Bikeparks oder Trailzentren aus dem Google-Fallback darf keine erfundene vollständige Routengeometrie erscheinen.

## Provider-Fallback

Ist der Overpass-Provider vorübergehend nicht erreichbar, soll das Modul nicht vollständig abstürzen. Sind Google-Ergebnisse verfügbar, zeigt Luvia vorübergehend Bikeparks und Trailzentren mit einem sichtbaren Hinweis auf den Provider-Fallback.

## Technische Browser-Tests

```javascript
LuviaPlaceRegistry.status('cycling_route')
```

Erwartet:

```javascript
{
  state: 'ready',
  ready: true,
  moduleVisible: true
}
```

```javascript
LuviaCyclingRoutes.diagnostics()
LuviaCyclingRouteIntelligence.diagnostics()
LuviaPlaceDetail.diagnostics()
```

Unter `capabilityRenderers` muss `cycling_route` enthalten sein.

```javascript
LuviaPlaceUIActions.schema('cycling_route')
```

Erwartet wird das kanonische Timeline-Feld `planned_at`.

```javascript
await LuviaPlaceConformance.runAll()
```

Erwartet:

```javascript
{
  ok: true,
  contracts: 7,
  violations: []
}
```

## Backend & Places Explorer

1. `backend.html` öffnen.
2. **Fahrradrouten testen** anklicken.
3. Eine Route über **Details** öffnen.
4. Route über **Zur Reise hinzufügen** importieren.
5. Danach in der App kontrollieren, dass genau eine kanonische Route angelegt wurde.
6. Den Import wiederholen. Es darf keine Dublette entstehen.

## Automatisierte Prüfungen

- Cycling Provider Gateway
- Cycling Route Intelligence
- Cycling Route Place Integration
- Global Place Planning Dialog
- Nature Intelligence und Integration
- Photo Spot Intelligence
- Shopping Intelligence und Integration
- Place Architecture Regression
- Place Contract Bootstrap Resilience
- Place Detail Capability Routing
- Places UI Refinement
- Release Version Consistency
- JavaScript-/CJS-Syntax
- TypeScript-Transpilation der Edge Function
- JSON- und CSS-Validierung
- lokale HTML-Referenzen
- vollständige ZIP-Integrität
