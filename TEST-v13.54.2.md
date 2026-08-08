# Test v13.54.2 / Core 4.54.2

Static contract checks cover the trusted `ready -> confirmed` exception, unchanged public transition matrix, provider-only source gate, internal-function execute revocation, provenance/timestamp fields, and runtime version consistency.

Production smoke test after deploy:
1. Existing Quandoo receipt remains contract-verified and mapped to `confirmed`.
2. Link/reprocess against the existing `ready` Quandoo test booking.
3. Booking becomes `confirmed` only through `provider_webhook` provenance.
4. Confirm `status_verified_at`, `confirmed_at`, `status_signal_id`, and `status_update_id` are populated.
