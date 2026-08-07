# Luvia v13.38.5 / Core 4.38.5

## Booking actions + automatic contact resolution
- Booking action buttons are bound directly to the mounted bookings view in capture phase, so shell event handling can no longer swallow Send/Cancel/Contact clicks.
- Manual contact fallback now persists into `bookings.contact.email`.
- Added automatic official-site contact resolution via `booking-contact-resolve`.
- Place website metadata is propagated into Booking Core; new bookings attempt contact resolution automatically.
- No guessed email addresses: only emails evidenced on the official public website become auto-usable.
