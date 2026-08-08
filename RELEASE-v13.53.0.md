# Luvia v13.53.0 / Core 4.53.0

## Booking Return Orchestration & Reconciliation Automation V1

This release makes the v13.52 provider-return and commercial reconciliation foundations eventually consistent instead of one-shot.

- Pending provider receipts are reprocessed when an exact provider reservation reference becomes available.
- Pending provider receipts are reprocessed when their correlation is later linked to a Luvia booking.
- The bookings view performs a safe trip-scoped reconciliation pass before rendering current booking data.
- Unknown provider vocabularies remain `pending_review`; they are never guessed.
- Conversion reports carrying commission evidence automatically open a pending commission reconciliation record.
- Commercial conversion/commission evidence never mutates reservation status.
- Every reconciliation cycle is audited in `booking_reconciliation_runs`.

No provider credentials, undocumented status vocabularies, or fake connected integrations are introduced by this release.
