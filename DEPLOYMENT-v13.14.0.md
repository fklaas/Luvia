# Deployment – Luvia 13.14.0 / Core 4.14.0

## 1. Datenbank

Keine neue SQL-Migration erforderlich.

Die historische Migration für `cycling_route` muss nicht zurückgerollt werden. Der Typ wird in Build 13.14.0 nicht mehr registriert, angezeigt oder über das Gateway verwendet.

## 2. Supabase Edge Function

Im entpackten Projektordner mit dem Unterordner `supabase`:

```bash
supabase functions deploy luvia-gateway
```

Das Deployment ist erforderlich, weil Cycling-Actions entfernt, die Transport-Suche erweitert und zusätzliche Google-Places-Detailfelder für Parken und Laden freigegeben wurden.

## 3. Secrets

Keine neuen Secrets erforderlich.

Der vorhandene Google-Places-Key muss Zugriff auf **Places API (New)** besitzen. Trailforks- und openrouteservice-Secrets werden von diesem Build nicht mehr verwendet.

## 4. Frontend

```bash
git add .
git commit -m "feat(places): add transport mobility and retire cycling routes"
git push
```

## 5. PWA-Cache

Neuer Cache:

```text
luvia-shell-v13.14.0
```

Nach dem Deployment alle Tabs und die installierte PWA schließen, einmal `force-update.html` öffnen und Luvia neu starten.
