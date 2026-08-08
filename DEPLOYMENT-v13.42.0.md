# Deployment v13.42.0

1. Deploy the web app package.
2. Run migration `20260808124400_core_v4_42_0_quandoo_adapter_foundation.sql` in the production Supabase SQL Editor.
3. Deploy Edge Function: `supabase functions deploy booking-provider-quandoo`.
4. Keep JWT verification ON for `booking-provider-quandoo`.
5. Do not add Quandoo credentials yet. The foundation must return `PARTNER_REQUIRED` until a real partner account is issued.
