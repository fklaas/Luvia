# Luvia 13.36.4 / Core 4.36.4 — Memory Deck Visual Cohesion & Focus Polish

## Color cohesion
- Single-author decks, loose cards and focus views resolve consistently from the active trip accent.
- Multi-author decks resolve card accents only from the participating travelers' profile colors whenever those colors are available.
- Memory member lookup now merges the live `memory_member_identity` projection instead of introducing the old hard-coded rose fallback into deck identity.
- Tints, borders, glows and shadows are deliberately closer to their source accent so one deck reads as one visual family.

## Curated spread composition
- Desktop spread positions now use count-aware, denser composition templates with smaller jitter.
- A protected header zone keeps cards below the Memory Moment heading.
- Hover always raises the active card above every neighboring card and adds a restrained lift, scale and depth treatment.
- Non-hovered cards are only subtly quieted so the spread stays readable without losing the shared scene.

## Memory stage
- The open-deck canvas now carries the trip accent through soft atmospheric gradients.
- The heading sits on a dedicated translucent surface using at most two resolved deck/profile accents.
- Small travel-memory symbols add low-contrast detail without becoming interactive UI.

## Card focus
- Focus mode now has a layered memory aura, a softly framed stage and a dedicated context panel.
- The focused card keeps its resolved identity accent and receives stronger depth without becoming visually detached from the deck.
- Empty-space click/tap still returns to a newly arranged spread.

## Mobile polish
- Mobile keeps its vertical touch-first trail but uses tighter offsets, calmer rotations and the same cohesive stage language.
- Header, focus panel and decorative background scale down without horizontal overflow.
