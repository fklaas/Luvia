# Testplan Luvia 11.1.0

1. App ohne sichtbares altes/neues Dashboard-Flackern öffnen.
2. Konsole darf keinen produktiven Aufruf von `ParisCloud.connect()` zeigen.
3. Abgemeldet: Login erscheint.
4. Angemeldet ohne Reise: Reise-Onboarding erscheint über „Reise erstellen“.
5. Bestehende Reise wird nach Reload geladen.
6. Dashboard und Restaurants wechseln ohne Seitenreload.
7. Restaurants wird beim Verlassen unmountet.
8. Developer Console, Backend & Places und Core-Diagnose bleiben direkt erreichbar.
