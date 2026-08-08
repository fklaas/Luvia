# Luvia v13.41.0 / Core 4.41.0 — TheFork Adapter Foundation

## Scope
Introduces the first provider-specific adapter on top of the provider-neutral Booking Core 4.40 status/provenance foundation.

## Included
- `LuviaTheForkProviderAdapter` client contract.
- Provider registry registration that becomes eligible only when TheFork is explicitly `connected` and a venue reference is known.
- Authenticated `booking-provider-thefork` Edge Function with diagnostics and safe `PARTNER_REQUIRED` behavior while partner access is absent.
- `booking_provider_references` table separating Luvia booking ID, TheFork restaurant reference and TheFork reservation reference.
- Service-role RPC seams for provider reference upsert/lookup.
- Conservative status mapping: unknown provider statuses are never guessed or auto-applied.
- No TheFork credentials are required for this foundation release.

## Safety
- TheFork stays `partner_required` after migration.
- No live TheFork API request is performed in this release.
- Live transport cannot be enabled merely by front-end code.
- Status auto-apply remains guarded by Core 4.40 `connected` + capability rules.
