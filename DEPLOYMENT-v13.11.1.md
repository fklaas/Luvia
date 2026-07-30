# Deployment – Luvia Build 13.11.1

## 1. SQL-Migration

Für diesen Build wurde keine neue Migration erstellt.

Die Fahrradrouten-Migration aus Build 13.11.0 muss bereits angewendet sein:

```text
supabase/migrations/20260730_036_core_v4_11_0_cycling_route_place_type.sql
```

Falls sie noch nicht deployed wurde, aus dem entpackten Projektordner ausführen:

```bash
supabase db push
```

Wurde sie bereits erfolgreich angewendet, entfällt der SQL-Schritt.

## 2. Supabase Edge Function

Erforderlich, weil Suchradius, Overpass-Timeout, parallele Endpunkte, Qualitätsranking und Fehlertoleranz im Gateway geändert wurden.

Aus dem entpackten Projektordner mit dem Ordner `supabase`:

```bash
supabase functions deploy luvia-gateway
```

Erfolgreich ist der Schritt, wenn die CLI `luvia-gateway` als deployed meldet.

Der Health-Check muss anschließend ausgeben:

```text
Build 13.11.1
Core 4.11.1
```

## 3. Secrets

Keine neuen Secrets erforderlich.

Optional bleibt ein eigener Overpass-Endpunkt möglich:

```text
OVERPASS_API_URL
```

Ohne dieses Secret verwendet Luvia weiterhin die eingebauten öffentlichen Endpunkte.

## 4. Frontend

```bash
git add .
git commit -m "fix(places): align cycling routes with global shell and fast discovery"
git push
```

Den vorhandenen Pages- beziehungsweise Frontend-Workflow vollständig abwarten.

## 5. PWA-Cache

Neuer Cache:

```text
luvia-shell-v13.11.1
```

## 6. Neustart

1. alle Luvia-Tabs schließen,
2. installierte PWA vollständig beenden,
3. `force-update.html` öffnen,
4. Luvia neu starten.

## 7. Sichtbare Abnahme

1. Places öffnen.
2. Fahrradrouten öffnen.
3. Der Header muss exakt dieselbe transparente globale Gestaltung wie Natur, Shopping und die übrigen Places besitzen.
4. MTB-Trails auswählen.
5. Bereits nach der ersten Provider-Antwort müssen Ergebnisse oder ein klarer Zwischenstatus sichtbar sein.
6. Während weitere Quellen laufen, dürfen vorhandene Karten nicht verschwinden.
7. Radius 100 km, 150 km und 200 km testen.
8. Ein Ergebnis favorisieren und zur Timeline hinzufügen.
9. Nach Reload müssen Favorit und Termin erhalten bleiben.
