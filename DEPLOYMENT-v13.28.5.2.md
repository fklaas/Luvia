# Deployment 13.28.5.2

Frontend correction build. Deploy the `luvia-gateway` function only if the currently deployed function predates the CORS headers included in this package.

```bash
supabase functions deploy luvia-gateway
git add .
git commit -m "fix: stabilize media runtime location exif and mobile studio"
git push
```

No `supabase db push` is required.
