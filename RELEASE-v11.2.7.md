# Luvia 11.2.7 / Core 3.0.2.7

## Places Session Token Reliability

- Gateway validates incoming Google Places autocomplete session tokens.
- Invalid UUID and legacy tokens are replaced server-side with cryptographically secure Base64URL tokens.
- The gateway returns the effective session token to the client for reuse during the selected-place flow.
- Frontend no longer generates Google-specific session token formats.
- All active runtime and diagnostics version displays updated to 11.2.7 / 3.0.2.7.
