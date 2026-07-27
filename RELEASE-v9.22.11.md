# Luvia v9.22.11 · Core v2.12.4.11

## Authenticated Sync Gate & Database Permission Repair

- Alle Reise-Synchronisationsmodule warten nun zentral auf eine gültige Anmeldung.
- Polling-Timer erzeugen auf dem Login-Screen keine Supabase-REST-Anfragen mehr.
- Nach Logout pausieren Budget, Erinnerungen, Live Moments und Tagesabschluss automatisch.
- Nach erneutem Login wird Benutzer- und Reisekontext neu aufgebaut, bevor Tabellen gelesen werden.
- Wiederholte 401-Fehler im Anmeldescreen werden dadurch unterbunden.
- Neue Supabase-Migration ergänzt die fehlenden Tabellenrechte für `authenticated`.
- `anon` erhält ausdrücklich keine Rechte auf private Reisetabellen.
