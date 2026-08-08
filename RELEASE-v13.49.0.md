# Luvia v13.49.0 / Core 4.49.0

## Fast Provider Handoff + Attribution Foundation

- Restaurant reservation routes are prefetched when the action enters the viewport, including mobile.
- Map/navigation/directions URLs are excluded from reservation routing, including redirect targets.
- Booking route resolution is category-aware. Restaurant provider engines are never used for accommodations.
- Accommodation booking action is intentionally disabled until the dedicated accommodation booking layer is introduced.
- Official restaurant contact pages are crawled for verified public email addresses when no direct booking route is available.
- Verified restaurant email is shown automatically in the fallback dialog; no manual email field is required.
- Clicking `Anfrage per E-Mail senden` creates the request and dispatches it immediately through Booking Core / Resend.
- If no verified email is available, Luvia only records the request and explicitly states that nothing was sent.
- Provider handoff clicks are persisted separately from booking confirmation for future attribution/affiliate reporting.
- Reisekompass profile persistence is hardened against auth/bootstrap races and own-row RLS/privilege drift.

No external handoff and no affiliate conversion is interpreted as a confirmed reservation.
