# Deployment – Luvia Build 13.13.0

## 1. Datenbank

Keine neue Migration. Falls die Fahrradrouten-Migration aus 13.11.0 noch nicht ausgeführt wurde:

```bash
supabase db push
```

## 2. Google Cloud konfigurieren

Der im Supabase Gateway verwendete Google-Key muss Zugriff auf beide Dienste besitzen:

- Places API (New)
- Routes API

Der Gateway verwendet zuerst `GOOGLE_MAPS_API_KEY`. Ist dieses Secret nicht gesetzt, wird der vorhandene `GOOGLE_PLACES_API_KEY` auch für Google Routes verwendet. Bei API-Einschränkungen muss der Schlüssel ausdrücklich für beide APIs freigegeben sein.

Optional kann ein eigener gemeinsamer Schlüssel gesetzt werden:

```bash
supabase secrets set GOOGLE_MAPS_API_KEY="DEIN_SERVERSEITIGER_GOOGLE_KEY"
```

`OPENROUTESERVICE_API_KEY`, `TRAILFORKS_APP_ID` und `TRAILFORKS_APP_SECRET` sind optional. Ohne sie muss Google weiterhin mehrere Fahrradrouten liefern.

## 3. Gateway deployen

Im entpackten Projektordner:

```bash
supabase functions deploy luvia-gateway
```

## 4. Frontend veröffentlichen

```bash
git add .
git commit -m "fix(cycling): rebuild discovery around Google Places and Routes"
git push
```

## 5. PWA aktualisieren

Aktiver Cache:

`luvia-shell-v13.13.0`

Nach dem Deployment alle Tabs und die installierte PWA schließen, einmal `force-update.html` öffnen und Luvia anschließend neu starten.

## 6. Backend-Kontrolle

```javascript
await LuviaBackend.request('cycling.health', {})
```

Erwartet wird unter `data.google.providers`:

```javascript
{
  places: true,
  routes: true
}
```

Direkter Provider-Test:

```javascript
await LuviaBackend.request('cycling.search.google', {
  profile: 'mtb',
  maxGeneratedResultCount: 4,
  destination: LuviaDestination.getActive()
})
```

Die Antwort soll unter `data.routes` mehrere Einträge und unter `data.summary.resultMode` den Wert `google-generated` enthalten.
