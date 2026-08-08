# Luvia v13.54.0 / Core 4.54.0

## Verified Provider Status Contracts V1

This release turns provider status mapping into an explicit, auditable contract layer.

- Adds `booking_provider_status_contracts` as the canonical registry for provider/transport status vocabularies.
- Only `verified_public` contracts may auto-apply a reservation status.
- Webhook contracts additionally require a verified transport before auto-apply.
- Quandoo gets a verified public webhook contract based on its documented notification types.
- Tock gets a verified public polling status vocabulary based on its documented Reservation `PartyState`; live polling remains disabled until partner transport is connected.
- Zenchef, SevenRooms, OpenTable, TheFork and Resy remain contract-gated until their exact partner status schemas are available.
- Provider receipts now persist `status_contract_id`, `status_contract_version` and `mapping_verified`.
- Reprocessing always re-evaluates the current provider status contract, so a previously pending receipt can become actionable after a contract is verified later.
- Unknown or unverified statuses remain `pending_review`; no guessed confirmation is possible.

Commercial conversion/commission signals remain separate from reservation status.
