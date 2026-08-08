# TheFork Adapter Foundation — Deployment

1. Deploy the web app.
2. Run migration `20260808110000_core_v4_41_0_thefork_adapter_foundation.sql` in the production Supabase SQL Editor.
3. Deploy Edge Function: `supabase functions deploy booking-provider-thefork`.
4. Keep JWT verification ON.
5. Do not add TheFork secrets yet. The adapter must return `PARTNER_REQUIRED` until an actual partner account is available.
