# Deployment · Luvia 13.37.7

1. Deploy the complete frontend package.
2. No new Edge Function is required.
3. No new database migration is required for this build, provided the existing Memory migrations through 13.37.1 are already deployed.
4. Open `force-update.html` once after deployment, then fully restart the browser/PWA.
5. Test with two authenticated trip members: traveler A completes all card reviews; traveler B should see the stack switch to the voting state via Realtime without reload. After both save votes, both should see the result state via Realtime.
