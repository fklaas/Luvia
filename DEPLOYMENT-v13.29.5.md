# Deployment 13.29.5

1. Apply `supabase/migrations/20260805234500_gallery_stabilization_direct_thumbnails.sql`.
2. Deploy the thumbnail backfill function:
   `supabase functions deploy luvia-media-delivery`
3. Deploy the complete web build.
4. Open `force-update.html`, then close every Luvia tab and the installed PWA.
5. Run the backfill for the active trip in the Supabase function tester or via an authenticated request with:
   `{ "tripId": "<TRIP_ID>", "limit": 100 }`
6. Repeat the backfill only when `processed` reaches the limit and more old media remain.
7. Open the gallery and verify the performance diagnostics.

No `luvia-gateway` deployment is required.
