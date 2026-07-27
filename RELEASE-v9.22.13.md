# Luvia v9.22.13 · Core v2.12.4.13

- Automatische `paris_claim_unowned_trip`-Aufrufe beim Rendern von „Meine Reisen“ entfernt.
- Claim-Fehler können Profil und Login-Screen nicht mehr fluten.
- People-/Presence-Lifecycle startet ausschließlich nach bestätigter Anmeldung und aktiver Reise.
- Logout beendet Heartbeat, Standorttimer und Realtime-Kanal vor dem Session-Abbau.
- Presence-RPCs werden bei fehlender Authentifizierung vollständig unterdrückt.
- Restaurant-Rendering ist gegen fehlenden Root-, Modell- und Heading-Kontext abgesichert.
