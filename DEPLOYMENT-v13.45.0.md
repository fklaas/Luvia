# Deployment – Luvia v13.45.0 / Core 4.45.0

1. Deploy the complete v13.45.0 web app.
2. Run this migration in the production Luvia Supabase SQL Editor:
   `supabase/migrations/20260808134500_core_v4_45_0_sevenrooms_console_reliability.sql`
3. Deploy the new Edge Function from the project root:
   `supabase functions deploy booking-provider-sevenrooms`
4. Keep JWT Verification ON for `booking-provider-sevenrooms`.
5. No SevenRooms secrets are required in this Foundation release.
6. Reload Luvia with a clean asset cache / force update if an older build is still shown.

## Post-deploy smoke checks
- Capability row `sevenrooms` remains `partner_required`.
- Authenticated `booking-provider-sevenrooms` availability request returns `ok:false`, `expected:true`, `PARTNER_REQUIRED`, and no Functions error.
- Normal authenticated app startup must not create repeated 401 calls to `trip_schedule_events` or `luvia-gateway`.
- Schedule and collaboration should resume automatically after auth/network becomes ready.
