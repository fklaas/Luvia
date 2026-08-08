# Deployment v13.52.0 / Core 4.52.0

1. Deploy the complete web app.
2. Run migration `supabase/migrations/20260808190000_core_v4_52_0_booking_reconciliation_provider_return.sql`.
3. Deploy `booking-provider-status-ingest` with JWT verification ON.
4. Deploy `booking-provider-quandoo-webhook` with JWT verification OFF only when the Quandoo partner webhook is actually being configured.
5. Before enabling the Quandoo webhook, create secret `QUANDOO_WEBHOOK_TOKEN` and ask Quandoo to send the same value as static header `X-Luvia-Quandoo-Token` for the registered webhook.
6. No provider should be switched to `connected` until actual partner credentials/contracts are available.
7. Redeploy `luvia-gateway --no-verify-jwt` for release diagnostics/version only.
