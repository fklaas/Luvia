# Deployment 13.36.8 / Core 4.36.8

1. Deploy the complete 13.36.8 frontend build.
2. No new Supabase SQL migration is introduced by this build.
3. No new Edge Function deployment is introduced by this build.
4. Open `force-update.html` once after deployment.
5. Fully close the PWA/browser tab and reopen Luvia.
6. Confirm runtime reports 13.36.8 / Core 4.36.8.
7. Execute `TEST-v13.36.8.md`, especially the real trip-accent and mobile throw tests.

Existing Memory identity migration from the earlier Memory build remains a prerequisite where profile-color realtime is used.
