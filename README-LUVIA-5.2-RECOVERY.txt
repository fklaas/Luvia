LUVIA 5.2 – RECOVERY UND FUNKTIONALE APP-SHELL

- index.html ist wieder die vollständige, funktionierende Luvia-App mit Login, Onboarding, Profil, Supabase und allen bisherigen Modul-Funktionen.
- trip.html führt sicher zu index.html zurück und kann keinen weißen Bildschirm mehr erzeugen.
- paris-official.html bleibt die vollständige gesicherte Paris-Reise.
- Die App-Shell zeigt die ORIGINALEN funktionierenden Bereiche jeweils als eigenen Screen.
- Galerie inklusive automatischer Tageszuordnung, Budget, Erinnerungen, Live Moments, Reiseassistent, Sprachcoach, Reisebuch und die Sync-Skripte stammen aus der funktionierenden v3.2.2-Basis.

SUPABASE
Die Konfiguration bleibt in auth/config.js; Sync bleibt in supabase-sync.js und sync/*.js. Erscheint in „Meine Reisen“ die SQL-Meldung, LUVIA-CLOUD-TRAVEL-MANAGEMENT.sql einmal im Supabase SQL Editor ausführen. Das ergänzt nur die Cloud-Reiseverwaltung.

DEPLOYMENT
Den kompletten Ordnerinhalt ins Repository-Root kopieren und alte Dateien überschreiben. Danach GitHub-Pages- und Browser-/Service-Worker-Cache leeren.
