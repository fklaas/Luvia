# Luvia v13.38.6 / Core 4.38.6

## Booking action event delegation fix

- Booking list actions are now handled through one document-level capture delegate.
- The handler survives App-Shell view transitions and booking-list innerHTML refreshes.
- Fixed actions: Verbindlich senden, Stornieren, Kontakt automatisch suchen, Kontakt manuell ergänzen.
- Booking view is explicitly unmounted on App-Shell view changes to avoid stale roots.
- No database migration and no Edge Function change required for this fix.
