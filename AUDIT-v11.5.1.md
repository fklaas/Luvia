# Technische Bestandsaufnahme – Luvia 11.5.1

## Tatsächlicher Ausgangsstand

- Ausgangspaket: Build 11.5.0 / Core 3.3.0
- Aktive Architektur: App Shell, Trip Store, UI Manager, Module Registry, Dashboard Widget Registry, Profile Foundation, Places/Restaurant Core
- Restaurant-Tab-Recovery ist bereits über `visibilitychange`, `focus` und `pageshow` vorbereitet.

## Priorität 1 – Status

- Responsive Dashboard: erste technische Stabilisierung umgesetzt; visueller Gerätetest erforderlich.
- Reise bearbeiten: eigener hochwertiger Editor vorhanden; responsive Stabilisierung umgesetzt; Design-Finaltest offen.
- Module bearbeiten: eigener Unterdialog vorhanden; Statusabgleich wird im nächsten Schritt gegen Cloud/RPC geprüft.
- Einladungen/QR/Hidden Onboarding/Reisebeitritt: noch nicht als einheitlicher produktiver Flow umgesetzt.
- Teilnehmer-Realtime: Alt-/Bestandsmodule vorhanden; Konsolidierung in den aktiven Core erforderlich.
- Dialogregistrierung: abgesichert.
- Restaurant Tab-Wechsel: Recovery vorhanden; Langzeittest erforderlich.
- JavaScript: aktive Dateien syntaktisch prüfbar; zwei falsch benannte Audio-Altdateien separat dokumentiert.
