# Luvia 11.2.4 · Core 3.0.2.4 — Architecture Reliability Gate

## Behoben
- Restaurantsuche und Filter bleiben in derselben Modulinstanz; Trip-Store-Nebenereignisse remounten das geöffnete Modul nicht mehr.
- Das vollständige Destination-Modell wird als JSONB in Supabase gespeichert und geräteübergreifend geladen.
- Onboarding nutzt explizit den zentralen `LuviaPlaces`/`LuviaBackend`-Pfad.
- Login hydriert zuerst alle Cloud-Reisen, bestimmt anschließend `activeTrip` und rendert erst danach Dashboard oder Empty State.
- Supabase ist für angemeldete Nutzer die führende Trip-Quelle; Local Storage bleibt Offline-Cache.
- Neue anonyme Konten können in der UI und Auth-API nicht mehr erzeugt werden. Bestehende anonyme Sitzungen bleiben nur zur kontrollierten Kontomigration erkennbar.

## Datenbank
Migration `20260727_004_core_v3_0_2_4_trip_destination_cloud_hydration.sql` vor dem App-Deployment ausführen.
