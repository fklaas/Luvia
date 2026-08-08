# Luvia v13.42.0 / Core 4.42.0 — Quandoo Adapter Foundation

## Scope
- Adds `LuviaQuandooProviderAdapter` on the provider-capability seam introduced in Core 4.40.
- Adds authenticated `booking-provider-quandoo` Edge Function.
- Models Quandoo merchant IDs, reservation IDs, agent_id attribution and reservation-status webhook vocabulary.
- Does not invent a live connection: capability remains `partner_required` until real credentials and partner activation exist.
- Expected provider business states (`PARTNER_REQUIRED`, credentials missing, live transport disabled) are returned as handled 200 responses with `ok:false, expected:true` to avoid false-red transport errors in browser consoles.

## Status mapping
Quandoo reservation notification types map into the unified Luvia status provenance contract. Unknown events are ignored rather than guessed.

## Production safety
No Quandoo secret is embedded in the browser. Future `QUANDOO_AUTH_TOKEN` and `QUANDOO_AGENT_ID` belong in Supabase Edge Function secrets only.
