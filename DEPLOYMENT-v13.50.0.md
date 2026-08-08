# Deployment v13.50.0 / Core 4.50.0

1. Deploy the complete web build.
2. Run `supabase/migrations/20260808172000_core_v4_50_0_booking_status_attribution_v2.sql` in the production Supabase SQL editor.
3. Redeploy `luvia-gateway` because its release diagnostics were aligned with 13.50.0 / 4.50.0.
4. No new secrets are required. Existing `luvia-intelligence` remains the AI execution path for discovery.plan/discovery.rank.
