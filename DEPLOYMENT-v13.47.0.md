# Deployment — v13.48.0 / Core 4.48.0

1. Deploy the complete web build.
2. Run `supabase/migrations/20260808150000_core_v4_47_0_tock_adapter_foundation.sql` in production.
3. Deploy `booking-provider-tock` with JWT verification ON.
4. Do not add Tock credentials until a verified provider/business access contract is available.
5. Run the capability-row and authenticated function smoke tests.
