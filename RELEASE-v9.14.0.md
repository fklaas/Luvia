# Luvia v9.14.0 — Intelligence Core v2.7 App Shell Foundation

## Änderungen

- Zentraler `LuviaAppState` für Authentifizierung, aktive Reise, Reisetyp und aktiven Screen.
- App Shell verwendet primär `LuviaTripContext` statt direkter Local-Storage-Abfragen.
- Stabilerer Start nach Anmeldung und Reiseauswahl.
- Reisewechsel und Moduländerungen aktualisieren Trip Context und App State konsistent.
- Recovery-Anzeige bei einem Shell-Aufbaufehler; vorhandene Inhalte bleiben nutzbar.
- PWA-App-Shell-Cache auf v9.14.0 aktualisiert und um die neuen Zustandsdateien ergänzt.
- Build-Metadaten auf Core 2.7 / Build 9.14.0 vereinheitlicht.

## Bewusst unverändert

- Supabase-Synchronisation
- bestehende Paris-Reise
- vorhandene Reisemodule und deren Daten
- Login- und Onboarding-Oberfläche
