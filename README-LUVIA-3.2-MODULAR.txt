LUVIA 3.2 – MODULARE REISEN

1. Der bestehende Paris-Stand bleibt vollständig erhalten.
   Reisen ohne gespeicherte Modulwahl verwenden automatisch alle bisherigen Module.

2. Neue Reisen erhalten im Einrichtungsassistenten einen zusätzlichen Schritt „Module“.
   Dort können Reiseassistent, Live Moments, Apps, Sprachcoach, Mobilität,
   Restaurants, Budget, Galerie, Fotospots, Erinnerungen, Reisetage,
   Cinematic Review, Reisebuch und Abschlussbereiche gewählt werden.

3. Unter Profil > Meine Reisen besitzt jede Reise den Button „Module“.
   Die Auswahl kann dort nachträglich geändert werden.

4. Modulquellen liegen einzeln unter modules/content/*.html.
   Nach einer Änderung kann tools/build-modules.py ausgeführt werden, um index.html
   aus den Fragmenten neu zu erzeugen. Die ausgelieferte index.html bleibt dabei
   absichtlich eine fertig kompilierte, stabile GitHub-Pages-Datei.

5. Die Modul-Metadaten und Sichtbarkeitslogik liegen getrennt unter modules/*.js.

6. Erinnerungs-Vorschläge können bei der Reiseerstellung ausgewählt werden und
   werden beim ersten Öffnen der Erinnerungen als eigene Punkte angelegt.

Die Auswahl wird sofort lokal gespeichert. Für die gemeinsame Synchronisierung
zwischen mehreren Geräten einmal LUVIA-MODULE-CONFIG-SETUP.sql in Supabase
ausführen. Ohne diese Migration funktioniert die Auswahl weiterhin lokal und
beeinträchtigt keine bestehenden Reiseinhalte.
