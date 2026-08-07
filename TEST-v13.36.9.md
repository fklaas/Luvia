# Testplan · Luvia 13.36.9

## Automated/local checks performed
- JavaScript syntax checks for changed critical JS files.
- App/Core version consistency.
- Service Worker and force-update version.
- Canonical `--trip-accent` source precedence in Memory UI and Memory Core.
- Single-author palette uses trip color for all backing layers.
- Theme-change rerender listener present.
- Distributed anchor composition and overlap budget present.
- Mobile four-layer throw stack and drag/throw thresholds present.
- Desktop hover lift retained.
- index.html local asset references resolved.
- CSS brace balance.
- Final ZIP integrity.

## Manual post-deploy validation required
1. Open a single-author stack for the active Paris trip. Its backing cards/borders must visibly use exactly the same trip accent as the active-trip buttons/texts.
2. Edit the trip accent, save, return to Memories and verify the single-author stack updates to the new color.
3. Open the same 8-card multi-author deck at least 8 times on desktop. Cards should cover the full stage without one-sided clusters; no card should be heavily hidden.
4. Hover every card: it must lift smoothly above neighbors without moving the rest of the composition.
5. On iPhone/Android, open a deck: front card plus three progressively offset backing cards should be visible.
6. Drag a mobile card partially and release: it springs back. Drag/flick far enough: it flies left/right and next card advances.
7. Confirm close/back/continue controls remain reachable.
