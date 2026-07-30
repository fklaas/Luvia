# Deployment – Build 13.11.0 / Core 4.11.0

## 1. SQL-Migration

Im Terminal in den entpackten Projektordner wechseln, in dem sich der Ordner `supabase` befindet:

```bash
cd PFAD/ZUM/ENTPACKTEN/LUVIA-PROJEKT
supabase db push
```

Ausgeführt wird insbesondere:

```text
supabase/migrations/20260730_036_core_v4_11_0_cycling_route_place_type.sql
```

Die Migration erweitert die vorhandene `places_primary_type_check`-Constraint um `cycling_route`. Sie erstellt keine neue Tabelle und verändert keine bestehenden Place-Datensätze.

Erfolgreich ist der Schritt, wenn die Supabase CLI keine Fehlermeldung meldet. Alternativ kann die SQL-Datei einmal vollständig im Supabase SQL Editor ausgeführt werden.

Optionale Kontrolle im SQL Editor:

```sql
select pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.places'::regclass
  and conname = 'places_primary_type_check';
```

In der Ausgabe muss `cycling_route` enthalten sein.

## 2. Supabase Edge Function

Weiterhin aus demselben Projektordner:

```bash
supabase functions deploy luvia-gateway
```

Erforderlich wegen:

- `cycling.health`
- `cycling.search`
- `cycling.details`
- OpenStreetMap-/Overpass-Provideradapter
- generischem Import nicht-googlebasierter Provider-Places
- Fahrradmodus in `routes.compute`
- Versionsausgabe 13.11.0 / 4.11.0

Erfolgreich ist der Schritt, wenn die CLI `luvia-gateway` als deployed meldet und der Gateway-Health-Check Core `4.11.0` sowie Build `13.11.0` ausgibt.

## 3. Secrets und Provider

Kein neues verpflichtendes Secret.

Optional kann ein eigener oder bevorzugter Overpass-Endpunkt gesetzt werden:

```bash
supabase secrets set OVERPASS_API_URL=https://DEIN-ENDPUNKT/api/interpreter
```

Ohne dieses Secret verwendet Luvia die im Gateway hinterlegten öffentlichen Fallback-Endpunkte.

Für Fahrrad-Anfahrtsrouten muss beim bestehenden Google Maps API Key die **Routes API** freigeschaltet sein. Es wird derselbe serverseitige Key wie bisher verwendet.

## 4. Frontend

```bash
git add .
git commit -m "feat(places): add cycling routes and mtb trail intelligence"
git push
```

Danach den bestehenden GitHub-Pages-/Deployment-Workflow vollständig abwarten.

## 5. PWA-Cache

Neuer Cache:

```text
luvia-shell-v13.11.0
```

## 6. Neustart

Alle Luvia-Tabs sowie die installierte PWA vollständig schließen und neu öffnen. Falls noch ein vorheriger Build angezeigt wird, einmal `force-update.html` öffnen und Luvia anschließend neu starten.
