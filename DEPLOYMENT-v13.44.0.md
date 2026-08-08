# Deployment v13.44.0

1. Deploy the v13.44.0 web app.
2. Run `supabase/migrations/20260808133000_core_v4_44_0_opentable_adapter_foundation.sql` in the production SQL Editor.
3. Deploy `booking-provider-opentable` with JWT verification ON.
4. Do not add OpenTable secrets yet. Live transport remains disabled until OpenTable grants partner access.
5. Smoke-test capability row and authenticated `availability` action. Expected result before partner access: HTTP 200 with `ok:false`, `expected:true`, `error:"PARTNER_REQUIRED"`.
