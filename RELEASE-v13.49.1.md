# Luvia v13.49.1 / Core 4.49.1

## Verified Booking Route & Contact Resolution Fix + Places Precision

- Rejects provider content that is not a booking surface (including Zenchef virtual-menu/menu pages).
- Requires an actual booking affordance before accepting provider handoff pages.
- Resolves provider routes from the official first page before broader crawling; fallback crawl is parallelized.
- Eagerly warms booking routes when Place actions enter the DOM.
- Removes manual e-mail fallback input from the reservation dialog.
- Displays verified public restaurant e-mail when found; otherwise explicitly states that the official sources were checked and no verified address was found.
- Sends the reservation e-mail directly only after the explicit user click and only to a verified address.
- Adds stricter semantic discovery for hidden-gem / specific-intent Places searches.
- Rejects obvious mass-tourism landmarks for explicit hidden-gem requests and penalizes excessive popularity.
- Canonicalizes provider place roles so mixed accommodation + restaurant places can be represented without changing the primary Place category.
- Accommodation booking remains separate from restaurant reservation routing.
