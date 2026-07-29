# Deployment Build 13.4.0

1. From the project root run `supabase db push`.
2. No Edge Function deployment is required.
3. No new secrets are required.
4. Deploy the complete frontend.
5. Wait until the new cache `luvia-shell-v13.4.0` is active.
6. Fully close and reopen the browser/PWA.

Success criteria: migration 030 is recorded, Core reports 4.4.0, Build reports 13.4.0, and both Restaurants and Accommodations show the shared progressive Place loading experience.
