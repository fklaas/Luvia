# Deployment · Build 13.1.0

1. Replace the repository contents with the complete Build 13.1.0 package.
2. No Supabase migration is required.
3. No Supabase Edge Function deployment is required.
4. Commit and push:

```bash
git add .
git commit -m "feat(today): introduce intelligent realtime day companion"
git push
```

5. Wait for the hosting deployment.
6. Unregister the old service worker and clear Cache Storage if the previous build remains visible.
