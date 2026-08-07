# Luvia v13.38.7 / Core 4.38.7

## Booking Action Execution Hardening
- Booking-Aktionen laufen nach dem funktionierenden globalen Click-Delegation-Fix jetzt direkt gegen die produktiven Core-/Function-Schnittstellen.
- Stornieren verwendet den kanonischen `luvia_transition_booking` RPC direkt.
- Versand und automatische Kontaktsuche zeigen HTTP-/Edge-Function-Fehler sichtbar in der Buchungskarte statt still zu scheitern.
- Buttons zeigen Busy-/Erfolgs-/Fehlerstatus und werden während laufender Aktionen gesperrt.
- Kein DB-Schema- oder Migrationswechsel.
