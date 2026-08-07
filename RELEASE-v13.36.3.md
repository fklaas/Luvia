# Luvia 13.36.3 / Core 4.36.3 — Memory Deck Choreography & Mobile Rework

## Memory Decks
- Single-author decks now use only the active trip accent family.
- Multi-author decks use the contributors' live profile colors, mixed inside one shared deck.
- Deck front photo is selected from photo cards; underlying card order is reshuffled per render.
- Hover exposes up to six card layers and makes multi-author color identity more visible.

## Choreography
- Deck opening now fades the rest of the memory overview, centers the selected deck and keeps a visible breathing/settling stage for about 2–3 seconds before spreading.
- Spread positions are re-generated each opening and again when returning from card focus.
- Closing a spread gathers cards back into the deck before returning to the complete overview.
- Card focus can be dismissed by clicking/tapping empty canvas space.

## Mobile
- Dedicated touch-first floating card trail instead of desktop coordinates squeezed onto a phone.
- One-column overview, large tappable decks, vertical spread, safe scrolling and no horizontal overflow.
- Focus cards stay within the viewport and preserve the playful deck identity.

## Realtime identity
- New `memory_member_identity` realtime projection mirrors display name, avatar and profile color.
- Profile color changes from a trip member can update visible Memory Deck identity without reloading the app.
