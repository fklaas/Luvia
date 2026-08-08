# Deployment v13.49.0 / Core 4.49.0

1. Deploy the complete web app.
2. Run `supabase/migrations/20260808165000_core_v4_49_0_fast_handoff_attribution_profile_fix.sql` in the production Supabase SQL editor.
3. Deploy `booking-route-resolve` with JWT verification ON.
4. No new secrets are required.
5. `booking-email-send` does not need a redeploy for this release. If `BOOKING_MODE` is still `test`, outbound mail continues to the configured test recipient; switch modes only when real restaurant contact is intentionally enabled.
