# Luvia Build 13.9.1.2 / Core 4.9.1.2

## Global Place Contract Bootstrap & Planning Parity

Dieser Fix behebt den globalen Ausfall der Timeline-Planung bei Unterkünften, Sehenswürdigkeiten, Fotospots und Shopping. Restaurant funktionierte noch, weil es seinen Planungsdialog bislang mit einem lokal fest codierten Feld öffnete und den zentralen Place-Type-Contract dadurch umging.

## Ursache

`place-type-contract.js` lieferte beim App-Start zeitweise HTTP 503. Ohne den Contract konnten die nachfolgenden Place-Type-Definitionen ihre Timeline-Felder nicht registrieren. Dadurch fehlten je nach Typ:

- `check_in_at` und `check_out_at` bei Unterkünften,
- `starts_at` bei Sehenswürdigkeiten,
- `planned_at` bei Fotospots,
- `planned_at` bei Shopping.

Der globale Planungsdialog meldete anschließend, dass für den jeweiligen Place kein Timeline-Schema registriert sei. Restaurant war nur deshalb nicht betroffen, weil es noch einen Sonderpfad mit einer lokal definierten `planned_at`-Definition verwendete.

## Kritischer Inline-Bootstrap

`index.html` installiert jetzt vor allen externen Place-Core-Dateien einen kleinen funktionalen Contract-Bootstrap. Er stellt sofort die zentrale Registry-API bereit, sodass `place-type-definitions.js` auch dann alle fünf produktiven Place-Contracts registrieren kann, wenn die vollständige Contract-Datei vorübergehend nicht geladen wird.

Der Bootstrap ist kein zweites Fachmodell. Er verwendet dieselbe globale API und denselben Contract-Datensatz. Sobald `place-type-contract.js` wieder verfügbar ist, übernimmt der vollständige Core alle bereits registrierten Contracts, validiert sie und aktualisiert Registry sowie Diagnostics auf Core 4.9.1.2.

## Alle produktiven Timeline-Schemata abgesichert

Auch im degradierten Bootstrap-Modus stehen unmittelbar bereit:

- Restaurant → `planned_at`
- Unterkunft → `check_in_at`, `check_out_at`
- Sehenswürdigkeit → `starts_at`
- Fotospot → `planned_at`
- Shopping → `planned_at`

Damit kann ein einzelner fehlgeschlagener Asset-Request nicht mehr sämtliche nicht-restaurantbasierten Places blockieren.

## Restaurant ohne Sonderweg

Restaurant verwendet nun ebenfalls:

```javascript
LuviaPlaceUIActions.openTimelineDialog(...)
```

und damit denselben Contract, denselben globalen Dialog, dieselbe Enter-Bestätigung und denselben Cloud-Writer wie alle anderen Place-Typen. Die vorhandene Prüfung gegen Restaurant-Öffnungszeiten bleibt als typabhängige Validierung erhalten.

## Vollständiger Contract-Upgrade

- Bootstrap-Contracts werden beim späteren Laden des vollständigen Contract-Cores nicht verworfen.
- Bereits registrierte Typen erhalten danach `contractVersion: 4.9.1.2`.
- `luvia:place-contract-registered` wird für übernommene Typen erneut ausgelöst, damit die Place Registry ihre Capabilities aktualisiert.
- Der Definitions-Loader versucht auch nach erfolgreicher Bootstrap-Registrierung weiterhin begrenzt, den vollständigen Validierungs-Core zu laden.
- Bleibt das Netzwerk gestört, bleibt die Planung funktional; Diagnostics kennzeichnet dann den Bootstrap-Modus transparent als degradiert.

## Datenbank und Provider

- Keine SQL-Migration.
- Keine neue Tabelle.
- Keine neuen Secrets.
- Keine lokalen Timeline-Schemata in den Modulen.
- Kein neuer fachlicher Speicherort.
- Edge Function nur für aktuelle Build- und Core-Anzeige erneut deployen.
