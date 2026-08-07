# Test plan 13.36.5 — Memory Deck Spatial, Color & Interaction Correction

## Automatically executed in build workspace
1. JavaScript syntax checks for changed/runtime-critical JS files.
2. Runtime version checks for 13.36.5 / Core 4.36.5.
3. `index.html` local asset reference validation.
4. Static regression guards for:
   - central visual palette resolver,
   - single-author trip-color stack layers,
   - removal of desktop slot templates,
   - full-stage spread CSS,
   - soft hover transition/lift,
   - animated background keyframes,
   - mobile non-overlapping layout,
   - removal of the old rose `--person-color` fallback.
5. CSS brace-balance sanity check.
6. ZIP integrity test after packaging.

## Manual browser regression after deployment
1. **Single author / closed stack** — all visible back layers must stay in the actual trip color family; no profile/default hue may appear as stack identity.
2. **Single author / open spread** — card identity/stage should consistently use the active trip accent.
3. **Multi author / closed stack** — back layers may only use the participating travelers' resolved profile colors (lighter tints are allowed, new hues are not).
4. **Desktop spread** — reopen the same 8-card deck repeatedly; cards should use the full width/height below the header and must not look like three columns or a grid.
5. **Header collision** — no card may cover the Memory Moment title/meta area.
6. **Hover** — hover partly overlapped cards; each should lift gently, scale slightly and become fully visible above neighbors without neighbor cards jumping away.
7. **Background** — observe the stage for at least 10–15 seconds; multiple travel/memory symbols should move very slowly and remain subtle.
8. **Mobile <=480 px** — every card must be readable/tappable, vertically spaced and scrollable; no negative-overlap pile.
9. **Tablet 481–800 px** — same readable vertical choreography without horizontal overflow.
10. **Focus/back/close** — open focus, return to spread, close deck; no persistent ghost card/state.
11. **Realtime profile colors** — change a participant profile color from another session and verify the deck refreshes after the existing identity projection update.

## Production-dependent / not proven by local static checks
- Exact trip accent returned by the deployed trip record for the user's real trip.
- Supabase `memory_member_identity` realtime propagation for other travelers.
- Actual signed photo rendering and auth/RLS behavior.
- Visual quality on real iOS/Android hardware.
