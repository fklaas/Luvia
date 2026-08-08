# Luvia v13.50.0 / Core 4.50.0

## Booking Status & Attribution V2
- Provider-neutral status evidence inbox with source authority and conflict handling.
- Handoff and affiliate callbacks can never auto-confirm a reservation.
- Separate attribution journey for handoff, affiliate click, conversion and commission facts.
- Status/attribution summary view and browser contracts.

## Reisekompass Intelligence & Universal Places Precision
- Reisekompass is passed as canonical profile context into search planning and ranking.
- Real Luvia AI `discovery.plan` and `discovery.rank` are used, with deterministic safe fallback.
- Strict category rules remain authoritative over AI output.
- `Unterkünfte` and `Fotospots` are available in Direkt entdecken.
- Hidden-gem searches reject mass-tourism candidates instead of returning famous sights.
- Fixed comma-clause bug: “Etwas finden, das nicht jeder Tourist kennt” remains one complete intent.
- Evidence conflicts are resolved into one state; contradictory statements are never emitted together.
- Explanations are written as natural German sentences instead of technical keyword fragments.

## Cross-Places
- Mixed places keep one canonical primary type while additional roles remain explicit. A hotel with an on-site restaurant stays an accommodation and exposes a separate restaurant booking domain instead of being routed through a restaurant provider as a hotel booking.
