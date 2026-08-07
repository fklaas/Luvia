# Test plan 13.36.4 — Memory Deck Visual Cohesion & Focus Polish

## Automated/static checks
- JavaScript syntax: `app/memory-worlds-v3.js`, `core/media/memory-cards.js`, kernel/service runtime JS.
- Runtime version references: active build files must expose 13.36.4 / Core 4.36.4 and the service-worker cache must be bumped.
- Asset references from `index.html` remain present.
- ZIP integrity test after packaging.

## Manual browser regression
1. Open a single-author Memory Deck: all stack layers/cards must remain within the active trip color family.
2. Open a multi-author Memory Deck: only participating profile colors may appear as identity accents.
3. Verify cards never cover the Memory Moment header on desktop.
4. Reopen the same deck several times: arrangement changes, but remains compact and balanced.
5. Hover every partly overlapping desktop card: hovered card must become fully visible above all neighbors.
6. Open a card focus: aura/context panel visible; empty canvas returns to a newly arranged spread.
7. Close the spread: gather animation returns cleanly without leaving a persistent ghost state.
8. Test <=480 px, 481–800 px and desktop widths for horizontal overflow and touch usability.
9. Change a participant profile color in another session and verify the Memory Deck refreshes through the existing realtime identity projection.

## Production-dependent
Supabase/profile-color realtime behavior and actual signed photo rendering require the deployed backend/authenticated trip and therefore must be verified after deployment.
