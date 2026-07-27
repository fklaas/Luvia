# Regressionstest Luvia 11.2.4

1. Login auf Gerät A: Cloud-Reisen erscheinen ohne Reload.
2. Login desselben Kontos auf Gerät B/Inkognito: dieselben Reisen; kein Onboarding bei vorhandener Reise.
3. Ohne Reisen: Empty State „Eure erste Reise wartet“.
4. Mehrere Reisen: zuletzt serverseitig aktualisierte bzw. vorhandene aktive Reise wird gewählt; Reisewechsel bleibt lokal erhalten.
5. Reise bearbeiten: Land/Region speichern, neu laden und auf zweitem Gerät prüfen.
6. Neue Reise im Onboarding: Places-Vorschläge, Details, Land, Place-ID und Koordinaten prüfen.
7. Restaurants öffnen, suchen, Quick-Filter und Sortierung betätigen: kein Modul-Remount; Ergebnisse bleiben sichtbar.
8. Logout/Login: Auth → Trips → activeTrip → Dashboard; kein manueller Reload.
9. Loginseite: keine Option „Ohne Konto fortfahren“; Quellcode enthält keinen Aufruf `signInAnonymously()`.
10. Offline mit zuvor geladenem Cache: letzter Stand bleibt als Fallback sichtbar, Cloudfehler wird protokolliert.
