# Luvia v13.39.3 / Core 4.39.3 — Booking Handoff Reliability

## Booking
- Provider handoff is validated server-side before navigation.
- Definitively broken booking pages/widgets (404/410/5xx, legal redirects, unavailable/not-found widget pages, venue mismatch) are rejected.
- If the first provider route is broken, the next verified route is tried automatically.
- E-mail remains the final automated fallback.
- A reservation click opens at most one external tab; the original Luvia tab is never replaced as a popup-blocker fallback.
- The visible “Buchungsweg wird geprüft …” button state was removed.

## Places UI
- AI search result cards use a consistent 350 px desktop height.
- Images, reason copy and action area are normalized so result rows stay aligned.
- Mobile keeps natural flexible height.

## Deploy
- Deploy the web app.
- Re-deploy `booking-route-resolve` with JWT verification ON.
- No SQL migration and no new secrets.
