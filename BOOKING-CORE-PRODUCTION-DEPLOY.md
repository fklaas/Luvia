# Booking Core V1 – Production Deploy

## Reihenfolge
1. Alle neuen Booking-Migrationen `20260807223000` bis `20260807223900` ausführen.
2. Edge Functions deployen:
   - `booking-email-send` (JWT an)
   - `booking-email-inbound` (JWT aus; Resend/Svix Signatur wird im Code geprüft)
   - `booking-health` optional
3. Secrets:
   - `RESEND_API_KEY` (Full Access, nur serverseitig)
   - `RESEND_WEBHOOK_SECRET`
   - `BOOKING_MODE=production`
   - `BOOKING_EMAIL_FROM=Luvia Booking <booking@booking.myluvia.app>`
   - `BOOKING_INBOUND_DOMAIN=booking.myluvia.app`
4. Resend Webhook auf `/functions/v1/booking-email-inbound`, Events `email.sent` und `email.received`.
5. Erst danach produktiven Versand aktiv testen.

## Sicherheit
- `SUPABASE_SERVICE_ROLE_KEY` niemals ins Frontend.
- Keine Provider-Mailadresse raten.
- Affiliate/external_link bestätigt niemals automatisch.
- Alternative Vorschläge bleiben `needs_action`.
