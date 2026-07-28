# Deployment 13.0.4.1

No database migration and no new secret are required.

The `luvia-gateway` Edge Function changed and must be deployed:

```bash
cd /path/to/luvia-main
supabase functions deploy luvia-gateway
git add .
git commit -m "fix(schedule): remove planned restaurant moments reliably"
git push
```
