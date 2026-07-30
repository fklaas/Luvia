# Deployment – Luvia Build 13.11.0.1

## 1. SQL-Migration

Für diesen Fix wurde keine neue Migration erstellt.

Falls Build 13.11.0 samt Fahrradrouten-Migration noch nicht vollständig deployed wurde, zuerst aus dem entpackten Projektordner ausführen:

```bash
supabase db push
```

Die bereits vorhandene Migration ist:

```text
supabase/migrations/20260730_036_core_v4_11_0_cycling_route_place_type.sql
```

Wurde sie bereits erfolgreich angewendet, ist kein weiterer SQL-Schritt nötig.

## 2. Supabase Edge Function

Erforderlich, damit Gateway-Health und Versionsanzeige Build `13.11.0.1` / Core `4.11.0.1` ausgeben.

Im entpackten Projektordner mit dem Ordner `supabase`:

```bash
supabase functions deploy luvia-gateway
```

Erfolgreich ist der Schritt, wenn die CLI `luvia-gateway` als deployed meldet und der Health-Check Build `13.11.0.1` sowie Core `4.11.0.1` zurückgibt.

## 3. Secrets

Keine neuen Secrets erforderlich.

## 4. Frontend

```bash
git add .
git commit -m "fix(places): register cycling routes in the global runtime"
git push
```

Den GitHub-Pages- beziehungsweise vorhandenen Frontend-Workflow vollständig abwarten.

## 5. PWA-Cache

Neuer Cache:

```text
luvia-shell-v13.11.0.1
```

## 6. Verbindlicher Neustart

Da der Fehler ausdrücklich aus einem gemischten Asset-/Cache-Stand entstand:

1. alle Luvia-Tabs schließen,
2. installierte PWA vollständig beenden,
3. `force-update.html` einmal öffnen,
4. danach Luvia neu öffnen.

## 7. Abnahme

In der Browser-Konsole:

```javascript
LuviaPlaceRegistry.status('cycling_route')
```

Erwartet:

```javascript
{
  state: "ready",
  ready: true,
  sourceData: true,
  moduleVisible: true,
  reason: "Fahrradrouten, MTB-Trails und Cycling Route Intelligence sind produktiv verbunden."
}
```

Anschließend Places → Fahrradrouten öffnen, MTB-Trails suchen, eine Route öffnen, favorisieren und zur Timeline hinzufügen.
