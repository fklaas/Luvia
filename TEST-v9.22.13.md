# Test v9.22.13

1. Ausloggen und Login-Screen mindestens 60 Sekunden offen lassen: keine Claim-/Presence-Requests.
2. Einloggen: App öffnet sich, Presence startet genau einmal.
3. Profil → Meine Reisen öffnen: keine wiederholten `paris_claim_unowned_trip`-Requests.
4. Reise wechseln und ausloggen: alte Timer und Realtime-Kanäle bleiben beendet.
5. Neue Reise anlegen und Restaurants öffnen: Modul rendert ohne `heading`-Fehler.
