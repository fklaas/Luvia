# Test plan 13.36.8 — Swipe Physics, Accent Source & Overlap Control

## Automated/static checks executed in the build workspace
1. JavaScript syntax for changed critical runtime files.
2. Runtime version consistency for App 13.36.8 / Core 4.36.8.
3. Service-worker and force-update cache targets.
4. Memory Core exposes canonical `tripAccent()` / `activeTrip()`.
5. Memory UI asks the Memory Core for the trip accent before fallback resolution.
6. Single-author stack layer palette contains only the trip accent.
7. Mobile throw-deck markup exists; old scroll-snap markup is absent from runtime JS.
8. Pointer down/move/up drag physics, velocity threshold, throw and spring-back paths exist.
9. Desktop overlap-budget geometry exists.
10. Desktop hover lift is retained.
11. CSS braces are balanced.
12. Local assets referenced by index.html exist.
13. No stale 13.36.7 / 4.36.7 references remain in active runtime/version files.
14. Final ZIP integrity.

## Manual post-deploy tests — required
### Canonical trip accent
1. Open Reise bearbeiten and note the exact saved Reisefarbe.
2. Open a Memory Moment with exactly one author.
3. Closed stack back-layers, border/glow and stack identity must visibly use that exact hue family.
4. Change the trip color, save, return to Memories and verify the single-author stack updates.
5. Author avatar/badge may retain the profile color; the single-author stack itself must not switch to the author color.

### Desktop overlap
1. Open the same 8-card deck at least 10 times.
2. Cards may overlap lightly, but no card should be covered so strongly that its content becomes effectively unreadable.
3. Cards must still look casually thrown, not gridded.
4. Hover each partly overlapped card: it must rise softly and appear fully above neighbours.

### Mobile throw deck
Test at <= 480 px and 481–800 px on a real touch device.
1. Opening a deck shows one readable front card with 1–2 cards visibly stacked behind it.
2. Drag slowly left/right: card follows the finger and rotates slightly.
3. Release before threshold: card springs back.
4. Swipe/throw beyond threshold: card exits fully left/right and the next card advances.
5. Fast flick with shorter distance also throws the card.
6. Tapping without dragging still opens card detail.
7. After the final card, “Stapel neu mischen” is reachable and restores the stack.
8. No card, header, close/back button or bottom action is clipped by the viewport/safe area.

## Not proven by static tests
Real Supabase trip data, real mobile pointer physics, exact visual overlap quality, browser/PWA caching after production deployment, signed photo rendering and realtime participant updates require manual deployed testing.
