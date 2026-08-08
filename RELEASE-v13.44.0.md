# Luvia v13.44.0 / Core 4.44.0 — OpenTable Adapter Foundation

## Scope
- Adds the first OpenTable-specific provider adapter.
- Models OpenTable RID separately from reservation references.
- Adds a server-side adapter seam for Directory lookup, availability, reservation creation, reservation lookup and cancellation.
- Keeps OpenTable `partner_required` until an actual partner contract and credentials exist.
- Uses controlled `ok:false, expected:true` responses for expected partner-access states.
- Does not claim a public webhook contract that is not verified in the public OpenTable documentation.
- Uses the existing unified status-provenance layer; automatic provider status remains blocked until the capability is `connected`.

## Public-contract basis
OpenTable publicly documents the Directory API for restaurant data/reservation links and recommends Consumer API v2 for new Online Booking API integrations. API access is partner/contract based.
