# Test plan 13.36.7 — Memory Deck Mobile Swipe, Travel Accent & Spatial Rebalance

## Automated/static checks executed in the build workspace
1. JavaScript syntax checks for changed/runtime-critical JS files.
2. Runtime version consistency for App 13.36.7 / Core 4.36.7.
3. Service-worker/cache and force-update version checks.
4. `index.html` local asset reference validation.
5. Static regression guards for:
   - root-level `--trip-accent` being preferred before trip/module fallback sources,
   - single-author stack palette remaining trip-accent only,
   - mobile swipe deck markup and scroll-snap implementation,
   - mobile path skipping the desktop scatter positioning algorithm,
   - swipe position indicator,
   - desktop sector-balanced scatter logic,
   - visible hover lift/scale/transition,
   - additional illustrated stage elements,
   - absence of stale 13.36.6 / Core 4.36.6 references in active runtime version files.
6. CSS brace-balance sanity check.
7. Final ZIP integrity test after packaging.

## Manual browser regression after deployment — mandatory
1. **Mobile <=480 px** — open an 8-card stack. Only one large readable card should be centered; swipe left/right through all cards without clipping.
2. **Mobile swipe counter** — confirm `1 von 8`, `2 von 8`, etc. follows the centered card while swiping.
3. **Mobile touch** — a horizontal gesture must move the deck; vertical browser/system gestures must not cause squeezed card layouts.
4. **Mobile focus** — tap a card to open focus view, return to the swipe deck and continue swiping.
5. **Single-author closed stack** — compare stack layers/front accent directly with a known active-trip colored button/text. Hue must match the trip accent, not a profile/module fallback.
6. **Multi-author stack** — stack identity may use only participating profile colors; no third hue.
7. **Desktop spread** — reopen the same 8-card deck 8–10 times. Cards should use a broad area, avoid dense center piles and avoid isolated extreme corners while still looking thrown.
8. **Desktop hover** — hover every card, especially partially overlapped ones. The card must visibly lift upward smoothly, settle rotation, scale slightly and remain above neighbors. Neighbors must not jump.
9. **Header safety** — no desktop card may cover the Memory Moment header.
10. **Illustrated background** — route lines plus ticket/photo/pin/heart/plane sketches should be noticeable but quiet; watch movement for ~20 seconds.
11. **Reduced motion** — with OS reduced-motion enabled, decorative movement should stop.
12. **Close/reopen** — close and reopen repeatedly; no ghost cards or stale positions.

## Production-dependent / not proven by local static checks
- Exact live trip accent value in the deployed user's active trip.
- Physical iOS/Android swipe feel and viewport/browser chrome behavior.
- Supabase realtime participant-color propagation.
- Signed photo rendering under real auth/RLS.
- Subjective quality of each randomized desktop scatter composition.
