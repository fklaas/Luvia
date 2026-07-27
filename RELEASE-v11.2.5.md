# Luvia 11.2.5 · Core 3.0.2.5

## Destination & Places Reliability Hotfix

- Supabase publishable key is now sent as `apikey` for direct Edge Function requests.
- Restaurant module receives the canonical trip model instead of a legacy-reduced representation.
- Destination context is refreshed before restaurant mount.
- Restaurant discovery no longer renders as an unexplained empty area while destination context is unavailable.
- An unexpectedly empty cloud result no longer deletes an existing valid device cache.
- Places onboarding logs and displays the concrete gateway error code for diagnosis.
- PWA resource versions increased to 11.2.5.

No SQL migration is required for this hotfix. The existing 11.2.4 migration remains required.
