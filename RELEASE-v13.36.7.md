# Luvia 13.36.7 / Core 4.36.7 — Memory Deck Mobile Swipe, Travel Accent & Spatial Rebalance

## Mobile swipe deck
- Replaced the mobile open-stack scatter/vertical pile with a dedicated horizontal swipe deck on <=800 px.
- One large Memory Card is centered at a time; native horizontal scrolling uses mandatory scroll-snap and touch panning.
- Added a live `x von n` position indicator and the hint `Nach links oder rechts wischen`.
- Cards remain large, readable and bounded to the mobile viewport instead of being squeezed together.
- The desktop free-scatter algorithm is not run on mobile.

## Single-author travel accent source
- Trip accent resolution now explicitly prefers `document.documentElement.style --trip-accent` and `document.body.style --trip-accent` before module-local/inherited colors.
- This is the same root-level trip accent written by the active dashboard/theme flow and therefore matches trip-colored buttons and text.
- Single-author stack layers/front identity continue to use only the resolved trip accent family.
- Individual open cards keep their author profile color as personal identity.

## Desktop spatial rebalance
- Rebalanced the guided scatter so it uses more of the available stage without returning to extreme isolation.
- Added eight-sector occupancy balancing to reduce dense piles while still keeping a random thrown-card character.
- Increased the desired nearest-neighbor distance and relaxed over-aggressive centroid cohesion from 13.36.6.
- Header safe area remains protected; there is still no grid or three-column template.

## Hover interaction correction
- Desktop card hover now visibly lifts by 18 px with a 285 ms cubic-bezier transition.
- The hovered card gets a small scale increase, rotation settles toward zero and shadow deepens smoothly.
- z-index rises immediately for correctness, while the visible movement remains animated; neighboring cards do not jump apart.

## Stage illustration upgrade
- Added more explicit travel-memory sketches: ticket, polaroid/memory frame, pin, heart and plane in addition to route traces/decor marks.
- Elements remain low-opacity, trip-accent tinted and slowly animated so the stage feels illustrated without competing with the Memory Cards.
- Reduced-motion still disables the decorative animation.
