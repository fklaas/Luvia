# Luvia 13.36.6 / Core 4.36.6 — Memory Deck Composition, Focus Meaning, Atmosphere, Typography & Mobile Recovery

## Priority 1 — Mobile Recovery
- Reworked the Memory deck overlay on <=800 px so the overlay itself is the scroll owner instead of nesting absolute desktop-style screens inside clipped containers.
- Mobile Memory screens now use normal document flow with `min-height: 100dvh`, safe-area aware top/bottom padding and visible overflow.
- The open deck is a dedicated vertical choreography: fully visible cards, real spacing, small alternating offsets/rotation, no negative overlap pile and no fixed stage height.
- Focus mode stacks the selected card and its explanation vertically and remains scrollable for long content.
- Back/close controls stay fixed to the viewport; the continue action remains reachable at the bottom.

## Single-author travel accent enforcement
- Trip accent resolution now prefers the actually inherited active Luvia theme CSS variables (`--trip-accent`, `--module-accent`, `--lv-accent`) before falling back to trip-record fields.
- This makes the Memory stack follow the same visible accent used by the active trip UI (for example the trip's primary action button).
- Closed single-author stack layers/front identity use the trip accent family.
- Individual open Memory Cards keep their author's resolved profile color when available; author identity and trip identity are deliberately separated.
- Multi-author stacks continue to use only resolved participating profile colors; missing individual colors reuse an already-resolved participating color rather than inventing another hue.

## Structured thrown-card composition
- Replaced pure full-canvas random placement with a guided scatter algorithm that evaluates many candidates per card.
- Placement now balances minimum separation, target nearest-neighbor distance, maximum separation, center cohesion and edge bounds.
- Cards still reroll and feel thrown onto the table, but extreme isolation and accidental piles are penalized instead of being accepted blindly.
- Desktop remains free-form: there is no grid, row or three-column template.

## Focus meaning and typography
- Focus mode no longer repeats a potentially long Memory Card text as a giant headline.
- The context panel now explains what the selected card represents: card type, author, Memory Moment/date, card position in the stack and a short type-specific meaning.
- Added content-length classes for short/medium/long textual cards so longer memories automatically receive calmer, smaller typography.

## Stage atmosphere
- Added a separate atmosphere layer with three animated route traces and a subtle Luvia moment postmark.
- Expanded the floating Memory/travel marks and increased their visibility while keeping them below the cards.
- Added light paper/grain and stronger trip-accent light fields so the open deck reads more like a travel-memory table than an empty white canvas.
- Reduced-motion preferences disable the route/decor motion.
