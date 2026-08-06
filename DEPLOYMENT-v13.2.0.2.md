# Deployment 13.2.0.2

1. Supabase-Migrationen anwenden:
   `supabase db push`
2. Gateway neu deployen:
   `supabase functions deploy luvia-gateway`
3. Frontend deployen.
4. App einmal vollständig neu laden.
5. In der angemeldeten App oder Core-Diagnose ausführen:
   `await LuviaCloudOnlyPlaceVerification.run({ rehydrate: true })`

Die Migration `20260728_027_core_v4_2_0_2_place_backend_stabilization.sql` ist zwingend erforderlich, da ein reines Frontend-Deployment den 403 auf `timeline_events` nicht behebt.
