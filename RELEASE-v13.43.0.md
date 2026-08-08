# Luvia v13.43.0 / Core 4.43.0 — Zenchef Adapter Foundation

## Scope
- Adds `LuviaZenchefProviderAdapter` on the Core 4.40 provider-capability/status-provenance seam.
- Adds authenticated `booking-provider-zenchef` Edge Function.
- Prepares Zenchef restaurant/reservation references, availability, create/update reservation calls and status callback mapping without inventing undocumented authentication details.
- Zenchef remains `partner_required` until a real partner/API contract is granted.
- Expected business states use handled HTTP 200 responses (`ok:false, expected:true`) instead of false-red transport errors.
- Aligns the existing TheFork Foundation with the same expected-state behavior for `PARTNER_REQUIRED`.

## Zenchef integration facts used by this foundation
Zenchef publicly documents availability checks, reservation retrieval, creation/modification, status updates and reservation-created/updated webhooks. Webhook URLs are configured in ZenchefOS; public material states only one webhook URL can be set per restaurant. The exact API authentication contract/status vocabulary is not guessed and stays disabled until official partner documentation is received.

## Production safety
No Zenchef credential is shipped to the browser. Future credentials remain Supabase Edge Function secrets only.
