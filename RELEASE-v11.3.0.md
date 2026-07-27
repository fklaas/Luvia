# Luvia 11.3.0 · Core 3.1.0 — Profile Foundation

## Umfang
- zentraler Profile Hub im Luvia-Branding
- Mein Profil mit Avatar, Name, Heimatort, Sprache, Zeitzone und Präferenzen
- Meine Reisen mit Reisewechsel, Bearbeitung, Erstellung und persönlicher Archivierung
- aktive Reise wird pro Benutzer in Supabase gespeichert
- zentrale Theme Engine: Hell, Dunkel und System
- reduzierte Animationen, Darstellungsdichte und Reisefarbensteuerung
- Cloud-Synchronisationsstatus und Profilvollständigkeit
- Sicherheits- und Datenbereich mit Passwort-Reset und JSON-Export
- vorbereitete Felder für Reise-Cover, Standort, Benachrichtigungen und Empfehlungen
- modular erweiterbare Dashboard Widget Registry
- genau eine zentrale Supabase-/GoTrueClient-Instanz
- responsive Profile Foundation für Desktop, Tablet und Smartphone

## Architektur
UI → Profile Foundation → Profile Service → zentraler Supabase Service → user_profiles

Dashboard-Inhalte werden über `LuviaDashboardWidgets` registriert und können in 11.4.0 ohne Parallelstruktur erweitert, sortiert und pro Reise konfiguriert werden.
