# Luvia v13.48.0 / Core 4.48.0 — Tock Adapter Foundation

## Scope
- Adds `LuviaTockProviderAdapter` and authenticated `booking-provider-tock` Edge Function.
- Promotes Tock from discovery-only to `partner_required` adapter foundation.
- Uses only publicly verified Tock reservation/status fields for the future status-polling seam.
- Does not claim public availability/create-reservation or webhook support where no general public contract was verified.
- Preserves the v13.45.1 console-reliability fixes.

## Safety
- No browser-side provider secrets.
- No undocumented Tock auth headers or endpoints invented.
- No automatic confirmed status without an actual connected provider reference/evidence path.
- Unknown Tock states are never guessed.

## Commit
`feat(booking): add Tock adapter foundation with verified reservation status seam`
