# Deployment – Luvia Build 13.12.0

## 1. SQL

Für diesen Build ist keine neue SQL-Migration erforderlich.

Die Migration aus Build 13.11.0 muss bereits angewendet sein:

```text
supabase/migrations/20260730_036_core_v4_11_0_cycling_route_place_type.sql
```

Falls sie noch nicht im verbundenen Supabase-Projekt vorhanden ist, im entpackten Projektordner ausführen:

```bash
supabase db push
```

## 2. openrouteservice-Schlüssel einrichten

Für die verlässlich erzeugten Rundtouren wird ein openrouteservice-API-Key benötigt. Er wird ausschließlich als Supabase-Secret gespeichert.

Im entpackten Projektordner:

```bash
supabase secrets set OPENROUTESERVICE_API_KEY="DEIN_OPENROUTESERVICE_KEY"
```

Der Schlüssel darf nicht in `index.html`, JavaScript-Dateien, Runtime-Konfigurationen oder Git gespeichert werden.

Kontrolle:

```bash
supabase secrets list
```

Die Liste muss den Namen `OPENROUTESERVICE_API_KEY` enthalten. Der geheime Wert wird dabei nicht ausgegeben.

## 3. Supabase Edge Function deployen

Anschließend aus demselben Projektordner:

```bash
supabase functions deploy luvia-gateway
```

Dieser Schritt ist zwingend erforderlich. Der Gateway enthält die neue Action `cycling.search.generated`, den sicheren openrouteservice-Zugriff und die hybride Ergebniszusammenführung.

Erfolgreich ist das Deployment, wenn die CLI `luvia-gateway` als deployed meldet und der System-Health-Check Build `13.12.0` sowie Core `4.12.0` ausgibt.

## 4. Frontend veröffentlichen

```bash
git add .
git commit -m "fix(cycling): add hybrid generated round-trip provider"
git push
```

Den bestehenden Pages-/Frontend-Workflow vollständig abwarten.

## 5. PWA-Cache

Der neue Cache lautet:

```text
luvia-shell-v13.12.0
```

Nach dem Deployment:

1. alle geöffneten Luvia-Tabs schließen,
2. die installierte PWA vollständig beenden,
3. einmal `force-update.html` öffnen,
4. Luvia neu starten.

## 6. Keine weiteren Secrets

Für diesen Build sind keine weiteren neuen Secrets erforderlich. `OVERPASS_API_URL` bleibt optional für einen bevorzugten Overpass-Endpunkt.

## 7. Providerhinweise

Openrouteservice-Attribution bleibt an den erzeugten Routendaten erhalten. Erzeugte Rundtouren sind algorithmische Routenvorschläge und keine Garantie für aktuelle Freigaben, Wegzustände oder ausgeschilderte Touren.
