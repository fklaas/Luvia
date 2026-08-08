# Deployment v13.54.0 / Core 4.54.0

1. Deploy the complete web app.
2. Run `supabase/migrations/20260808203000_core_v4_54_0_verified_provider_status_contracts_v1.sql` in the production Supabase SQL editor.
3. Redeploy `booking-provider-status-ingest` with JWT verification ON.
4. Redeploy `booking-provider-quandoo-webhook` with JWT verification OFF.
5. Redeploy `booking-provider-tock` with JWT verification ON.
6. Redeploy the central gateway: `supabase functions deploy luvia-gateway --no-verify-jwt`.

No new secret is required for the migration or Tock contract foundation. `QUANDOO_WEBHOOK_TOKEN` is still only required when the real Quandoo webhook is activated.

Smoke tests:
- verify `booking_provider_status_contracts` contains Quandoo=`verified_public`/webhook and Tock=`verified_public`/polling;
- verify Zenchef/SevenRooms remain `partner_schema_required` and cannot auto-apply;
- resolve `RESERVATION_CONFIRMED` for Quandoo webhook with verified transport -> `confirmed`;
- resolve the same with unverified webhook transport -> no auto-apply;
- resolve unknown status -> no auto-apply;
- verify existing SevenRooms pending-review receipt remains pending review.
