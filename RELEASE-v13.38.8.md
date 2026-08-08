# Luvia v13.38.8 / Core 4.38.8

## Booking Edge Function CORS Fix

- `booking-email-send` answers browser CORS preflight (`OPTIONS`).
- `booking-contact-resolve` answers browser CORS preflight (`OPTIONS`).
- Both functions return the required CORS headers for requests from `https://myluvia.app`.
- Fixes `Failed to send a request to the Edge Function` caused by missing `Access-Control-Allow-Origin`.

No database migration required. Redeploy the two Edge Functions above.
