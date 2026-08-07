# Luvia 13.36.8 / Core 4.36.8 — Memory Deck Swipe Physics, Accent Source & Overlap Control

## Scope
Targeted correction build for the Memory Deck experience on top of 13.36.7.

## Changes
- Mobile open-deck interaction replaced: horizontal scroll-snap/carousel removed from runtime markup.
- New Tinder-style throw interaction using Pointer Events:
  - front card follows the finger/pointer,
  - horizontal drag adds subtle rotation,
  - short gestures spring back,
  - sufficiently long or fast gestures throw the card out left/right,
  - next cards remain visible as a physical stack,
  - stack can be reset after the last card.
- Desktop scatter now uses an overlap budget. Candidate positions are scored by actual projected overlap area, crowding, nearest-neighbour distance and edge pressure.
- Desktop hover lift retained and strengthened as a soft visual transition; neighbouring cards do not move.
- Trip accent source moved into the Memory Core API (`LuviaMemoryCards.tripAccent()`). It reads the canonical active trip first (`LuviaTripStore.snapshot().activeTrip`) and returns the saved trip `accent` before UI/CSS fallbacks are considered.
- Single-author deck layers remain strictly bound to that trip accent. Individual opened cards keep their author identity color.
- Memory home rerenders when the canonical active trip changes, so a changed trip accent is picked up without relying on stale module CSS.

## Architecture
No new parallel color store was introduced. The Memory UI consumes the canonical trip context through the Memory Core helper. No new database schema or provider integration is introduced.
