# Deployment Build 13.9.0.1

## 1. SQL

Keine SQL-Migration erforderlich.

## 2. Edge Function

Aus dem entpackten Projektordner, in dem sich der Ordner `supabase` befindet:

```bash
supabase functions deploy luvia-gateway
```

Erwartet wird anschließend Build `13.9.0.1` und Core `4.9.0.1` im Gateway-Health-Check.

## 3. Secrets

Keine neuen Secrets erforderlich.

## 4. Frontend

```bash
git add .
git commit -m "fix(places): recover global contracts and timeline schemas"
git push
```

Den GitHub-Pages- beziehungsweise bestehenden Deployment-Workflow vollständig abwarten.

## 5. PWA und Cache

Neuer Cache: `luvia-shell-v13.9.0.1`.

Da der Fehler selbst im alten Service Worker lag, nach abgeschlossenem Deployment:

1. alle Luvia-Tabs und die installierte PWA vollständig schließen,
2. Luvia neu öffnen,
3. bei weiterhin sichtbarem Altfehler einmal `force-update.html` aufrufen,
4. anschließend Luvia erneut öffnen.

`force-update.html` entfernt ausschließlich technische Service-Worker- und Cache-Daten. Fachliche Reise- und Place-Daten bleiben in Supabase erhalten.
