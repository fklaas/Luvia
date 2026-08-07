# Luvia 13.37.0 / Core 4.37.0 — Memory Visual System V1

## Visual identity
- Memory cards now follow one clear hierarchy: trip accent defines atmosphere; profile colors identify authors.
- Single-author cards/decks consistently use the active trip accent family.
- Multi-author decks use only live participant profile colors when available; no synthetic fallback accent is introduced between participants.
- Shared Memory Moment header uses at most two participating profile colors, while the canvas remains tied to the trip accent.

## Memory Canvas
- New atmospheric canvas with subtle travel/memory symbols and a restrained trip-color ambient treatment.
- Redesigned Memory Moment header as a separate visual island with participant identity.
- The spread layout now reserves a protected header zone so cards cannot cover the title/date area.
- Desktop placement is still organic and randomized, but uses a compact bounded grid to reduce excessive empty space.

## Card interaction
- Desktop hover raises the active card above all neighboring cards, straightens it and gives it a stronger focus shadow.
- Focus view has a richer visual composition with type icon, atmospheric panel and trip-color detail work.
- Card type styling is deliberately quieter so author/trip identity remains dominant.

## Mobile Memory Deck
- Mobile no longer inherits squeezed desktop coordinates.
- Cards are arranged as a compact, scrollable, staggered deck trail with controlled overlap and readable card sizes.
- First tap brings a card fully to the foreground and straightens it; second tap opens the detail view.
- Header, cards and bottom action use dedicated safe zones to prevent collisions.
