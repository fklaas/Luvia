# Deployment – Luvia Build 13.11.2

## 1. SQL

Keine neue SQL-Migration erforderlich.

Die vorhandene Migration aus Build 13.11.0 muss weiterhin angewendet sein:

```text
supabase/migrations/20260730_036_core_v4_11_0_cycling_route_place_type.sql
```

Falls noch nicht geschehen, im entpackten Projektordner:

```bash
supabase db push
```

## 2. Supabase Edge Function

Erforderlich, weil die Fahrradrouten-Providerpipeline, Actions, Queries, Clusterbildung und Ergebniskennzeichnung vollständig geändert wurden.

Im Projektordner mit dem Unterordner `supabase`:

```bash
supabase functions deploy luvia-gateway
```

Erfolgreich ist der Schritt, wenn die CLI `luvia-gateway` als deployed meldet. Der System-Health-Check muss danach Build `13.11.2` und Core `4.11.2` ausgeben.

## 3. Secrets

Keine neuen verpflichtenden Secrets.

Optional bleibt ein eigener Overpass-Endpunkt möglich:

```text
OVERPASS_API_URL
```

## 4. Frontend

```bash
git add .
git commit -m "fix(cycling): rebuild staged route and trail discovery"
git push
```

Den Frontend-/Pages-Workflow vollständig abwarten.

## 5. PWA-Cache

```text
luvia-shell-v13.11.2
```

Danach alle Luvia-Tabs und die installierte PWA vollständig schließen. Einmal `force-update.html` öffnen und Luvia anschließend neu starten.

## 6. Sichtbarer Test

1. Places → Fahrradrouten öffnen.
2. Der Einstieg „Entdecken“ muss mit 150 km starten und darf nicht leer werden, nur weil keine MTB-Relation vorhanden ist.
3. MTB-Trails wählen; empfohlen werden automatisch 200 km.
4. Exakte MTB-Treffer müssen zuerst erscheinen.
5. Fehlen exakte Treffer, muss Luvia passende Alternativen sichtbar erklären statt eine leere Liste auszugeben.
6. Gravel, City, Familie und Radtouren prüfen.
7. Eine Route beziehungsweise ein Trailgebiet favorisieren und zur Timeline hinzufügen.
8. Nach Reload müssen Favorit, Ergebnisart und Termin erhalten bleiben.
