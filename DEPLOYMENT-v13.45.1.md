# Deployment – Luvia v13.45.1 / Core 4.45.1

1. Deploy the complete v13.45.1 web app.
2. No SQL migration is required.
3. Re-deploy the existing central gateway from this package so the CORS fix is live:

   `supabase functions deploy luvia-gateway --no-verify-jwt`

   The `--no-verify-jwt` flag is intentional: the gateway performs its own per-action auth handling and must allow browser OPTIONS preflight requests through to the function.
4. No secrets change is required.
5. Hard refresh/reopen Luvia, keep DevTools Console open, navigate Today → Plan → Trip → Bookings and leave the app open for at least 30 seconds.
6. Verify there are no Luvia-owned red errors for `luvia_presence_heartbeat` or `luvia-gateway` CORS.
