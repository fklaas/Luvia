# Luvia v13.54.1 / Core 4.54.1 — Trusted Internal Status Bridge Fix

Patch for the verified provider-status return path discovered during the Quandoo end-to-end smoke test.

## Fixed
- Separates service-role ingress from trusted database-internal status processing.
- Correlation/reconciliation triggers no longer depend on `request.jwt.claim.role` being present.
- Internal status functions are not executable by `public`, `anon`, `authenticated`, or `service_role`.
- Existing service-role RPC seams remain protected by `SERVICE_ROLE_REQUIRED`.
- A verified provider status contract can bypass only the commercial `connected` gate inside the protected reprocessor; provider transport capability and transition validation remain mandatory.
- Verified Quandoo webhook status can now complete the full Correlation → Booking → Status Signal → Status Update path.
- Unverified, unmapped, handoff, and affiliate signals keep their existing non-confirming safety behavior.

## Regression safety
- No client-side direct confirmation seam was added.
- Unknown provider statuses remain review-only.
- Handoff and affiliate conversion cannot confirm a booking.
