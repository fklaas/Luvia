# Deployment v13.54.1 / Core 4.54.1

1. Deploy the complete v13.54.1 web app.
2. Run `supabase/migrations/20260808211500_core_v4_54_1_trusted_internal_status_bridge_fix.sql` in the production Supabase SQL editor.
3. Redeploy `booking-provider-status-ingest` with JWT verification ON.
4. Redeploy `booking-provider-quandoo-webhook` with JWT verification OFF.
5. Redeploy the central gateway: `supabase functions deploy luvia-gateway --no-verify-jwt`.

No new secrets are required.

Smoke test: link the existing verified Quandoo correlation to its test booking. The correlation trigger must reprocess the verified receipt without `SERVICE_ROLE_REQUIRED`, create a status signal/update, and move the booking from `ready` to `confirmed` with `status_source=provider_webhook`.
