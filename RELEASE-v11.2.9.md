# Luvia 11.2.9 · Core 3.0.2.9

## Cloud Auth & Destination Integrity

- Restaurant requests obtain the token from the canonical Supabase client and retry once after a session refresh on HTTP 401.
- App Gateway DOM operations are safe on pages without the login overlay.
- Trip editing preserves the complete canonical destination object.
- Supabase merges non-empty destination fields and can no longer erase existing country, Place ID or coordinates through incomplete writes.
- All active runtime, diagnostics and PWA version indicators updated together.
