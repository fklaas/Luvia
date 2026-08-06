# Deployment · Build 13.0.1

1. Replace the repository contents with the complete Build 13.0.1 project.
2. No Supabase migration is required.
3. No Edge Function changed; do not redeploy `luvia-gateway` for this build.
4. Run `git add .`.
5. Run `git commit -m "feat(ui): unify restaurant experience with place components"`.
6. Run `git push`.
7. Wait for the hosting deployment.
8. Reload the PWA and accept the update; if necessary clear the old service worker cache.
