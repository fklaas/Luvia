# Deployment v13.43.0

1. Deploy the v13.43.0 web build.
2. Run migration `supabase/migrations/20260808130000_core_v4_43_0_zenchef_adapter_foundation.sql`.
3. Deploy `booking-provider-zenchef` with JWT verification ON.
4. Re-deploy `booking-provider-thefork` to activate the expected-state console cleanup for `PARTNER_REQUIRED`.
5. No Zenchef secrets are required at Foundation stage.

Do not set Zenchef to `connected` and do not invent API credentials before an official partner/API contract exists.
