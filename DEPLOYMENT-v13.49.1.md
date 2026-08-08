# Deployment v13.49.1

1. Deploy the complete web app.
2. Redeploy Supabase Edge Function `booking-route-resolve` with JWT verification ON.
3. No new SQL migration is required for v13.49.1.
4. No new secrets are required.
5. Hard refresh / PWA update once after deployment so cache `luvia-shell-v13.49.1` is active.

## Smoke checks
- Pink Mamma -> correct SevenRooms booking page, one tab, no menu/maps page.
- Le Poulbot (or equivalent) -> Zenchef virtual-menu is rejected as booking route.
- Restaurant without provider -> dialog shows verified public e-mail or explicit "not found" result; no manual fallback field.
- Verified e-mail -> explicit click sends via Booking Core.
- Places query "Etwas, das nicht jeder Tourist kennt" -> Eiffel Tower/Louvre/Arc de Triomphe/Sacré-Cœur/Musée d'Orsay must not dominate results.
- Mixed accommodation + restaurant Place keeps `accommodation` primary type and `restaurant` as secondary role only.
