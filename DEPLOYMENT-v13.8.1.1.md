# Deployment Build 13.8.1.1

## 1. SQL-Migrationen

Keine SQL-Migration erforderlich.

## 2. Supabase Edge Function

Die fachliche Gateway-Logik wurde nicht verändert. Damit Backend, App, Diagnose und Health-Check denselben Build ausgeben, muss die Edge Function aus dem entpackten Projektordner mit dem Verzeichnis `supabase` erneut veröffentlicht werden:

```bash
supabase functions deploy luvia-gateway
```

Erfolgreich ist der Schritt, wenn die CLI die Function als deployed meldet und der Gateway-Health-Check Build `13.8.1.1` sowie Core `4.8.1.1` ausgibt.

## 3. Secrets

Keine neuen Secrets erforderlich.

## 4. Frontend

```bash
git add .
git commit -m "fix(places): restore photo guidance across detail entry points"
git push
```

Den bestehenden GitHub-Pages- beziehungsweise Frontend-Workflow vollständig abwarten.

## 5. PWA-Cache

Neuer Cache:

```text
luvia-shell-v13.8.1.1
```

## 6. Neustart

Nach abgeschlossenem Deployment:

1. Luvia beziehungsweise die installierte PWA vollständig schließen.
2. Browser-Tab oder PWA neu öffnen.
3. Bei weiter sichtbarem Altstand einmal den Website-Cache beziehungsweise die installierte PWA aktualisieren.
