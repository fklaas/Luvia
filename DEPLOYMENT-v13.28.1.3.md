# Deployment 13.28.1.3

Frontend-only correction.

```bash
git add .
git commit -m "fix: repair gallery photo picker button"
git push
```

Then close all tabs/PWA instances, open `force-update.html`, update and verify App 13.28.1.3 / Core 4.28.1.3.

Do not run `supabase db push`. Do not deploy Edge Functions.
