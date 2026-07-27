# Luvia 11.2.8 · Core 3.0.2.8

## Destination Preservation & Restaurant Search Parity

- Google Places address components, country and country code remain available after gateway normalization.
- Trip onboarding persists the country from the selected Places result, with formatted-address fallback.
- Restaurant discovery uses the same provider search contract as the successful Backend Explorer and does not inject a narrower type filter unless explicitly requested.
- Incomplete destination contexts fall back to the active resolved destination.
- Cloud hydration merges destination data field by field. Empty or missing remote values can no longer erase a valid cached destination.
- Runtime, diagnostics, PWA and gateway versions updated together.
