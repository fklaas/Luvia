# Deployment 13.36.5 / Core 4.36.5

## Required
1. Deploy the complete 13.36.5 frontend build.
2. Open `force-update.html` once after deployment to unregister the old service worker/cache.
3. Fully close and reopen the installed PWA/browser tab.
4. Confirm runtime reports **13.36.5 / Core 4.36.5**.
5. Run the manual Memory regression checklist from `TEST-v13.36.5.md`.

## Supabase
- No new SQL migration is introduced by 13.36.5.
- No Edge Function deployment is introduced by 13.36.5.
- The existing `20260807123500_memory_member_identity_realtime.sql` migration from 13.36.3 must already be deployed for shared profile-color realtime behavior.
