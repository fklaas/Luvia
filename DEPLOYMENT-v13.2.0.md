# Deployment – Build 13.2.0

1. Apply migration `supabase/migrations/20260728_026_core_v4_2_0_universal_place_data_completion.sql`.
2. Deploy the updated gateway from the project root:
   `supabase functions deploy luvia-gateway`
3. Deploy the frontend.
4. Open the Core diagnostics and verify all 11 adapters. Restaurant must show `ready`; future visible modules show `provider_ready`.
