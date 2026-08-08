# Luvia v13.54.2 / Core 4.54.2 — Verified Provider Transition Fix

Patch for the final verified-provider end-to-end status path discovered during the Quandoo smoke test.

## Fixed
- A verified provider contract may now move a booking directly from `ready` to `confirmed` when the trusted source is `provider_webhook`, `provider_api`, or `provider_polling`.
- The shared `luvia_booking_transition_allowed` matrix is intentionally unchanged, so browser/client, handoff and affiliate paths do not gain a new confirmation transition.
- The exception exists only in the protected database-internal provider apply core after trusted contract resolution.
- Successful confirmation records `status_source`, `status_source_ref`, `status_verified_at`, `confirmed_at`, a status update, and a booking event.
- Status-update evidence records whether the special trusted `ready -> confirmed` path was used.

## Security invariants retained
- Unverified webhooks cannot confirm.
- Unknown provider statuses remain review-only.
- Handoff and affiliate conversion cannot confirm.
- Internal apply functions remain directly non-executable by public/anon/authenticated/service_role.
