# Luvia v13.52.0 / Core 4.52.0

## Booking Reconciliation & Provider Return V1

This release continues the Booking Core after v13.51.0.

- correlation-aware provider status receipt inbox
- authoritative provider status application through Booking Status V2
- provider-reference fallback when no correlation token is present
- unlinked/unknown provider events are retained for reconciliation instead of guessed
- conversion/commission reconciliation ledger
- commission paid attribution without mutating reservation status
- direct Quandoo webhook receiver prepared around Quandoo's documented custom static webhook headers
- internal API/polling status ingest bridge for connected provider adapters
- provider access remains `partner_required` until real commercial credentials are connected

Safety invariant: conversion or commission evidence can never confirm a reservation.
