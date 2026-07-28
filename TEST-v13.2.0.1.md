# Testplan 13.2.0.1

## Automatische Prüfungen

- JavaScript-Syntaxprüfung aller Dateien unter `core`, `intelligence` und `modules`.
- Statische Prüfung, dass Schedule, Today, Live Day, Timeline, Place Visits und Restaurantmodul keine fachliche `localStorage`-Persistenz enthalten.
- Diagnose-Service prüft verbotene alte Domain-Keys.

## Manueller Cloud-Rehydration-Test

1. Zwei unterschiedliche McDonald's-Orte mit verschiedenen Google-Place-IDs importieren, beispielsweise Meppen und Haren.
2. Beide auf denselben Tag legen.
3. Unterschiedliche Uhrzeiten speichern.
4. Seite hart neu laden.
5. Browser-Sitedaten löschen, neu anmelden und dieselbe Reise öffnen.
6. Zweites Gerät öffnen.

Erwartung:

- Beide Orte bleiben getrennt sichtbar.
- Jede Uhrzeit bleibt dem richtigen `trip_place_id`/`provider_place_id` zugeordnet.
- Today und Timeline werden direkt aus Supabase aufgebaut.
- Es entsteht keine leere Karte durch einen lokalen Snapshot.
- Eine fehlgeschlagene Cloud-Schreiboperation wird als Fehler angezeigt und nicht lokal vorgemerkt.

## Entwicklerkonsole

```js
await LuviaCloudOnlyPlaceVerification.run({ rehydrate: true })
```

`passed` muss `true` sein. `forbiddenLocalDomainKeys` muss leer sein.
