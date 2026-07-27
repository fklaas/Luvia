# Regressionstests · Luvia 11.2.13

1. Browserdaten löschen, anmelden und eine Reise erstellen. Es darf weder `NOT_TRIP_OWNER` noch `column role does not exist` erscheinen.
2. Reise bearbeiten, Land und Zeitraum ändern und speichern. Der Button zeigt einen Lade- und Erfolgszustand.
3. App neu laden und dieselben Daten kontrollieren.
4. Mit demselben Konto inkognito anmelden und vollständiges Cloud-Profil prüfen.
5. Eine Testreise direkt in Supabase löschen und die App neu laden. Die Reise muss lokal und als aktive Reise verschwinden.
6. Netzwerk offline schalten: Bei einem echten RPC-Ausfall darf der letzte Cache weiterhin angezeigt werden.
7. Developer Console und Diagnoseseiten zeigen Build 11.2.13 / Core 3.0.2.13.
