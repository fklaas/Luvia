# Luvia 11.2.6 · Core 3.0.2.6

## Places Bootstrap & Diagnostics Consistency

- Places Autocomplete beim Erstellen einer neuen Reise ist vollständig vom aktiven Reiseziel entkoppelt.
- Ein leerer oder beschädigter bestehender Destination Context kann Autocomplete nicht mehr mit `DESTINATION_NAME_REQUIRED` blockieren.
- App-, Core-, PWA- und Gateway-Version wurden auf 11.2.6 / 3.0.2.6 vereinheitlicht.
- Developer Console, Backend Console und Diagnose/Test-Seite laden alle Kernskripte mit dem aktuellen Cache-Buster.
- Gateway- und Places-Health-Endpunkte melden 3.0.2.6.
- Keine SQL-Migration erforderlich.
- Die enthaltene Supabase Edge Function `luvia-gateway` muss neu deployt werden.
