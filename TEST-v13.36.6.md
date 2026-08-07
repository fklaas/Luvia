# Test plan 13.36.6 — Memory Deck Composition, Focus Meaning, Atmosphere, Typography & Mobile Recovery

## Automated/static checks executed in the build workspace
1. JavaScript syntax checks for all changed/runtime-critical JS files.
2. Runtime version consistency for App 13.36.6 / Core 4.36.6, service-worker cache and force-update target.
3. `index.html` local asset reference validation.
4. Static regression guards for:
   - inherited active trip accent as first visual source,
   - single-author stack palette forced to trip accent,
   - individual card author-color separation,
   - guided scatter distance/cohesion scoring,
   - absence of desktop grid/slot placement in the new algorithm,
   - focus context/meaning fields instead of duplicated giant content headline,
   - short/medium/long text classes,
   - route/atmosphere layer and animation,
   - mobile single-scroll-owner recovery rules,
   - mobile normal-flow spread and focus layout,
   - mobile card width bounded to viewport,
   - safe-area padding.
5. CSS brace-balance sanity check.
6. Final ZIP integrity test after packaging.

## Manual browser regression after deployment — mandatory
1. **Mobile <=480 px (highest priority)** — open an 8-card stack and scroll from the header to the last card. Every card must be fully visible, readable and tappable; nothing may be cut off horizontally or vertically.
2. **Mobile focus** — tap a long quote/thought. Selected card + explanation must both be reachable by normal vertical scrolling; back and close must remain usable.
3. **Mobile browser chrome/safe areas** — test Safari/PWA/Chrome where available. Navigation controls and the bottom continue action must not sit underneath system bars.
4. **Single-author closed stack** — compare the visible stack layers/front accents with the currently chosen trip accent in the live trip UI. They must belong to the same hue family.
5. **Single-author open cards** — author badge/card identity may use the author's profile color; the surrounding stage remains trip-accent led.
6. **Multi-author closed/open stack** — no hue outside the participating travelers' resolved profile colors may appear as author/stack identity.
7. **Desktop composition** — reopen the same 8-card deck at least 5 times. Layout should vary, use the stage broadly, avoid isolated corner cards and avoid dense accidental piles while still looking thrown/free-form.
8. **Header safety** — no card may cover the Memory Moment title block.
9. **Hover** — partially overlapped cards should lift gently and become fully visible without neighboring cards jumping.
10. **Atmosphere** — watch for 15–30 seconds. Route traces and travel/memory marks should be visible but subtle and slowly moving.
11. **Focus semantics** — quote, reaction, vibe and photo cards should each produce an explanation that makes clear what the selected card means in the Memory Moment.
12. **Long text** — long thoughts must not create one-word-per-line giant typography in focus mode.
13. **Close/reopen** — return from focus to spread, close the deck, reopen it and verify no ghost/stale positioning remains.

## Production-dependent / not proven by local static checks
- The exact accent value returned by the user's deployed active trip/theme.
- Realtime propagation of another participant's profile color through Supabase.
- Signed photo rendering under real auth/RLS.
- Real iOS/Android viewport behavior and subjective visual composition.
