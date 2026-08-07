# Deployment 13.36.7 / Core 4.36.7

## Required
1. Deploy the complete 13.36.7 frontend build.
2. Open `force-update.html` once after deployment to unregister old service worker/cache state.
3. Fully close and reopen the installed PWA/browser tab.
4. Confirm runtime reports **13.36.7 / Core 4.36.7**.
5. Run the mobile swipe, single-author trip-accent and desktop hover/scatter checklist in `TEST-v13.36.7.md`.

## Supabase
- No new SQL migration is introduced by 13.36.7.
- No new Edge Function deployment is introduced by 13.36.7.
- The existing `20260807123500_memory_member_identity_realtime.sql` migration from 13.36.3 must already be deployed for shared profile-color realtime behavior.
