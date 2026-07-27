# Deployment Luvia 11.2.9

1. Execute `supabase/migrations/20260727_005_core_v3_0_2_9_destination_integrity.sql` in Supabase SQL Editor.
2. Deploy the complete frontend package.
3. No gateway deployment is required; the Edge Function implementation is unchanged.
4. Wait for Cloudflare deployment, close all app tabs and reload.
5. Verify Build 11.2.9 / Core 3.0.2.9 in Console and Diagnostics.
