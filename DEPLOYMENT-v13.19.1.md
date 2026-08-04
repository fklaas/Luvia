# Deployment 13.19.1

No destructive migration is required for planned-visit semantics; these are application-level context changes. Deploy `luvia-intelligence` because client/build metadata and AI instructions changed. Run existing pending database migrations only after migration history is repaired.

```powershell
supabase functions deploy luvia-intelligence
git add .
git commit -m "feat(discovery): add conversational AI discovery and planned visits"
git push
```
