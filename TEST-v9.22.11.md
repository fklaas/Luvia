# Test v9.22.11

1. App vollständig abmelden und Login-Screen mindestens 15 Sekunden offen lassen.
2. Konsole prüfen: keine wiederholten REST-Aufrufe an day_closures, budget_entries, reminder_status, custom_reminders, live_moment_status oder daily_member_stats.
3. Anmelden: App muss Reise und Module laden, ohne manuelles Neuladen.
4. Budget, Erinnerungen, Live Moments und Tagesabschluss öffnen und Änderung speichern.
5. Abmelden, 15 Sekunden warten: keine neuen 401-Requests der genannten Tabellen.
6. Erneut anmelden: Module müssen ihre Cloud-Daten wieder laden.
7. Supabase-Migration `20260727_005_core_v2_12_4_11_sync_permissions.sql` im SQL Editor ausführen, bevor die Tabellen-Synchronisation abschließend getestet wird.
