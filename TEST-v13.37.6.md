# Testplan — Luvia 13.37.6 / Core 4.37.6

## Automated/local checks executed
- JavaScript syntax for critical Memory/Core/version runtime files.
- Version and service-worker cache consistency.
- 152 local assets referenced by `index.html`; none missing.
- CSS brace integrity.
- Spread cards receive center-origin motion vectors and stagger order.
- Spread receives `mc-motion-ready` after positions are calculated.
- Closing uses the gather-back choreography.
- Hover does not scale cards and uses the softer 9 px lift.
- `prefers-reduced-motion` fallback is present.
- Voting result state has priority over stale review-progress copy.
- Voting actions can remain visible when vote progress already exists.
- Old `Noch X Karten gemeinsam ansehen` overview wording is absent.
- Home overview refresh is explicitly triggered after closing a reviewed spread.
- Curation buttons have no positional hover transform.
- Coarse-pointer/touch guard prevents first-tap sticky-hover behavior.
- Desktop spread cards use one shared height regardless of Hero/Story/Signal state.
- Existing mobile swipe and voting/result code paths remain present.

## Manual browser tests after deployment
1. Open a Memory stack on desktop/laptop: cards should leave the common center smoothly and settle at their radial positions.
2. Hover every spread card: card should rise gently and smoothly without snapping or scaling.
3. Close the spread: cards should gather back before the overlay fades.
4. Complete album review on all cards, close the spread, and verify the stack overview immediately shows the next meaningful state rather than `Noch X Karten gemeinsam ansehen`.
5. If points already exist, verify `Punkte ändern` or `Ergebnis ansehen` remains visible even after reload.
6. Click `Titel vorschlagen`, `Lieblingsmomente wählen` / `Punkte ändern`, and `Ergebnis ansehen` once each. One click must trigger the action; the button must not shift away under the pointer.
7. On a touchscreen or hybrid laptop, confirm the first tap activates the intended stack/action instead of only triggering hover.
8. Verify Hero, Story and Signal cards remain visually the same physical size after album selection/result states.
9. Test Windows display scaling / laptop rendering for perceived smoothness and sharpness.
10. Mobile: verify Tinder swipe, review feedback and completion remain unchanged.
11. With reduced-motion enabled in the OS/browser, verify motion is effectively minimized.
