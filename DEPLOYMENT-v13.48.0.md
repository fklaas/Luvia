# Deployment — v13.48.0 / Core 4.48.0

1. Deploy the complete web build.
2. Run `supabase/migrations/20260808154500_core_v4_48_0_official_booking_engines_detection_v2.sql`.
3. Deploy `booking-route-resolve` with JWT verification ON.
4. No new secrets are required.
5. Run capability/detection smoke tests before release.
