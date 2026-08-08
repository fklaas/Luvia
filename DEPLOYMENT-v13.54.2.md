# Deployment v13.54.2 / Core 4.54.2

1. Deploy the complete v13.54.2 web app.
2. Run `supabase/migrations/20260808213000_core_v4_54_2_verified_provider_transition_fix.sql` in the production Supabase SQL editor.
3. Redeploy the central gateway: `supabase functions deploy luvia-gateway --no-verify-jwt`.

No provider Edge Function or new secret is required for this DB-only status-transition patch.

Smoke test: reprocess the existing verified Quandoo receipt linked to booking `a71b1066-43c7-4c63-9775-0c4cbe9d1624`. It must move `ready -> confirmed`, set `status_source=provider_webhook`, set verified/confirmed timestamps, and create status signal/update provenance.
