# Luvia v13.48.0 / Core 4.48.0 — Official Booking Engines & Provider Detection V2

## Scope
- Expands provider detection beyond the dedicated partner-adapter group.
- Adds discovery-only engine identities for CoverManager, ResDiary, TableCheck, Formitable, aleno and simpleERB.
- Adds Tock handoff-domain detection to the route resolver.
- Detects booking links in anchors, iframes, forms, booking data attributes and embedded booking configuration.
- Records detected engine identities separately from the actual verified handoff URL.
- Keeps venue matching, legal-page rejection, broken-widget rejection and server-side handoff validation mandatory.
- Preserves the v13.45.1 console-reliability fixes.

## Safety
- Engine detection does not imply API access.
- New engine capability rows are discovery-only and claim no availability/create/status transport.
- Script URLs can identify an embedded engine but are never used as booking handoff destinations.
- E-mail remains fallback after healthy verified booking routes.

## Commit
`feat(booking): expand official booking engine detection and verified handoff routing`
