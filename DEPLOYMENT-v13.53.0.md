# Deployment v13.53.0 / Core 4.53.0

1. Deploy the complete web app.
2. Run `supabase/migrations/20260808194500_core_v4_53_0_booking_return_orchestration_reconciliation_automation.sql` in the production Supabase SQL editor.
3. Deploy the central gateway for version/health consistency: `supabase functions deploy luvia-gateway --no-verify-jwt`.
4. No new secrets are required.

Smoke test after deployment:
- confirm `booking_reconciliation_runs` and `booking_return_orchestration_summary` exist;
- run `luvia_booking_reconcile_trip_returns` for an accessible trip or open the Bookings view;
- verify a pending/unlinked receipt is not promoted unless an exact correlation/provider reservation reference exists;
- verify auto-created commission reconciliation remains `pending` and produces no booking status update.
