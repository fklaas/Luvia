# Deployment Build 13.9.0

Alle Befehle werden im entpackten Projektordner ausgeführt, in dem sich die Ordner `supabase`, `core`, `modules` und die Datei `index.html` befinden.

## 1. SQL-Migrationen

Keine SQL-Migration erforderlich.

Shopping verwendet die bereits vorhandenen Objekte:

- `public.places`
- `public.trip_places`
- `public.trip_place_data`
- `public.luvia_import_place_entity(...)`
- `public.luvia_upsert_trip_place_fields(...)`

Es muss deshalb weder `supabase db push` noch SQL im Supabase SQL Editor ausgeführt werden.

## 2. Supabase Edge Function

Die Edge Function muss neu veröffentlicht werden, weil `place.import` typabhängige Extension-Felder nun zentral in `trip_place_data` persistiert und die Health-Ausgabe auf Build 13.9.0 / Core 4.9.0 angehoben wurde.

```bash
supabase functions deploy luvia-gateway
```

Erfolgreich ist der Schritt, wenn die Supabase CLI `luvia-gateway` als deployed meldet. Danach muss der Health-Check Build `13.9.0` und Core `4.9.0` ausgeben.

## 3. Secrets

Keine neuen Secrets erforderlich.

Die vorhandenen Supabase- und Google-Places-Secrets werden unverändert verwendet.

## 4. Frontend

```bash
git add .
git commit -m "feat(places): add contract-driven shopping and retail intelligence"
git push
```

Anschließend den bestehenden GitHub-Pages- beziehungsweise Frontend-Deployment-Workflow vollständig abwarten.

## 5. PWA-Cache

Neuer Cache:

```text
luvia-shell-v13.9.0
```

## 6. Browser und App neu starten

Nach abgeschlossenem Deployment:

1. Luvia beziehungsweise die installierte PWA vollständig schließen.
2. Alle noch geöffneten Luvia-Tabs schließen.
3. Browser oder PWA neu öffnen.
4. Bei weiter sichtbarem Altstand einmal den Website-Cache beziehungsweise die installierte PWA aktualisieren.

## 7. Deployment-Kontrolle

Nach dem Neustart prüfen:

- App zeigt Build 13.9.0 / Core 4.9.0.
- Places-Hub zeigt Shopping.
- Backend & Places Explorer enthält „Shopping testen“.
- Developer Console meldet `shopping → ready`.
- Gateway-Health und App-Version stimmen überein.
