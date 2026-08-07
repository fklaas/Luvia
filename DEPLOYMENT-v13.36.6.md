# Deployment 13.36.6 / Core 4.36.6

## Required
1. Deploy the complete 13.36.6 frontend build.
2. Open `force-update.html` once after deployment to unregister the old service worker/cache.
3. Fully close and reopen the installed PWA/browser tab.
4. Confirm runtime reports **13.36.6 / Core 4.36.6**.
5. Run the mobile-first and color/composition checklist in `TEST-v13.36.6.md`.

## Supabase
- No new SQL migration is introduced by 13.36.6.
- No Edge Function deployment is introduced by 13.36.6.
- The existing `20260807123500_memory_member_identity_realtime.sql` migration from 13.36.3 must already be deployed for shared profile-color realtime behavior.
