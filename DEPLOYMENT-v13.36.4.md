# Deployment 13.36.4

1. No new database migration or Edge Function deployment is required for this build.
2. Keep the migrations required by 13.36.3 in place, especially `20260807123500_memory_member_identity_realtime.sql`.
3. Deploy the complete frontend build.
4. Open `force-update.html` once after deployment.
5. Close all Luvia tabs/PWA windows and reopen.
6. Verify `13.36.4 · Core 4.36.4`.
7. Manually verify one single-author and one multi-author Memory Deck on desktop and mobile.
