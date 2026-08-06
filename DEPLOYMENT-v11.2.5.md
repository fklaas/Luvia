# Deployment · Luvia 11.2.5

1. Ensure the SQL migration from 11.2.4 has already been executed.
2. Replace the repository contents with the full 11.2.5 package.
3. Commit and push to GitHub.
4. Deploy the included `supabase/functions/luvia-gateway` only when the currently deployed gateway is older than the project copy.
5. Wait for Cloudflare Pages deployment.
6. On mobile, fully close and reopen the PWA. If 11.2.4 remains visible, remove the old service worker/site data once.
7. Run `TEST-v11.2.5.md`.

No additional SQL migration is required.
