# Deployment – Luvia Build 13.9.1

## 1. SQL-Migration

Nicht erforderlich.

Build 13.9.1 verwendet weiterhin die vorhandenen Tabellen und die vorhandene RPC:

```text
trip_place_data
luvia_upsert_trip_place_fields
```

## 2. Supabase Edge Function

Erforderlich, weil Gateway-Health und zentrale Versionsmetadaten auf Build 13.9.1 / Core 4.9.1 angehoben wurden.

Im Terminal in den entpackten Projektordner wechseln, in dem sich der Ordner `supabase` befindet:

```bash
cd PFAD/ZUM/ENTPACKTEN/LUVIA-PROJEKT
supabase functions deploy luvia-gateway
```

Erfolgreich ist der Schritt, wenn die Supabase CLI `luvia-gateway` als deployed meldet und der Health-Check Build `13.9.1` sowie Core `4.9.1` ausgibt.

## 3. Secrets

Keine neuen Secrets erforderlich.

## 4. Frontend

Aus demselben Projektordner:

```bash
git add .
git commit -m "fix(places): unify planning editor and guard cloud identifiers"
git push
```

Anschließend den vorhandenen GitHub-Pages- beziehungsweise Frontend-Deployment-Workflow vollständig abwarten.

## 5. PWA-Cache

Der neue Cache lautet:

```text
luvia-shell-v13.9.1
```

## 6. Neustart

Nach abgeschlossenem Deployment:

1. alle geöffneten Luvia-Tabs schließen,
2. eine installierte PWA vollständig beenden,
3. Luvia neu öffnen,
4. bei sichtbarem Altstand einmal `force-update.html` ausführen oder den Website-Cache löschen.

## 7. Schneller Deployment-Test

1. Eine Sehenswürdigkeit planen.
2. Oberhalb der Suche `Datum und Uhrzeit ändern` öffnen.
3. Datum oder Uhrzeit anpassen und Enter drücken.
4. Es darf kein Browser-Alert und kein UUID-Fehler erscheinen.
5. Der sichtbare Eintrag und der Dashboard-Kalender müssen sich ohne Reload aktualisieren.
