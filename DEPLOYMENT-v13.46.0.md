# Deployment – v13.46.0 / Core 4.46.0

1. Deploy the full web build.
2. Run `supabase/migrations/20260808143000_core_v4_46_0_resy_adapter_foundation.sql` in the production Supabase SQL editor.
3. Deploy `booking-provider-resy` with JWT verification ON.
   CLI: `supabase functions deploy booking-provider-resy`
4. No Resy secrets are required for the foundation build.
5. Run the capability and authenticated `PARTNER_REQUIRED` smoke tests before release approval.
