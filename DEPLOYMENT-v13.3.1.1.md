# Deployment – Luvia 13.3.1.1

## 1. SQL

Keine neue SQL-Migration erforderlich. Die Migration aus Build 13.3.1 muss bereits vorhanden sein. Außerdem muss die bestehende RPC `luvia_get_trip_modules(uuid)` verfügbar sein.

## 2. Edge Function

Keine Änderung an `luvia-gateway`; kein erneutes Deployment erforderlich.

## 3. Secrets

Keine neuen Secrets.

## 4. Frontend

Aus dem Projektordner:

```bash
git add .
git commit -m "fix(stay): persist module selection and unify navigation transitions"
git push
```

## 5. PWA-Cache

Neuer Cache: `luvia-shell-v13.3.1.1`.

## 6. Neustart

Deployment abwarten, Browser beziehungsweise PWA vollständig schließen und neu öffnen. Bei einem alten Stand einmal hart neu laden oder die Website-Daten der PWA aktualisieren.
