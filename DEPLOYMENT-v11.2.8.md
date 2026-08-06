# Deployment Luvia 11.2.8

1. Replace the repository content with the complete package and push it.
2. Deploy the gateway because its Places normalization changed:
   `supabase functions deploy luvia-gateway --project-ref yiadkcxgyzdgyadnhyqe`
3. Wait for Cloudflare Pages deployment.
4. Close all app and diagnostics tabs and reload once.
5. Verify Build 11.2.8 / Core 3.0.2.8 / Gateway 3.0.2.8.

No SQL migration is required.
