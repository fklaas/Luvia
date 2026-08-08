# Deployment — v13.40.0 / Core 4.40.0

1. Web-App v13.40.0 deployen.
2. In Supabase SQL Editor Migration ausführen:
   `supabase/migrations/20260808103000_core_v4_40_0_booking_provider_capabilities_status.sql`
3. Keine neuen Secrets.
4. Keine neue Edge Function in diesem Foundation-Schritt.
5. Bestehende `booking-route-resolve`, `booking-email-send`, `booking-email-inbound`, `booking-health`, `booking-contact-resolve` unverändert lassen.
6. Danach Smoke-Abfragen aus `BOOKING-PROVIDER-CAPABILITY-STATUS-SMOKE.sql` ausführen.
