# Luvia 13.37.6 · Core 4.37.6
## Memory Motion & Interaction Polish

### Scope
- Restore a visible desktop spread choreography from the common deck center to the radial target positions.
- Stagger card departures for a softer physical deck-opening feel.
- Smooth spread closing by gathering cards back toward the shared center before the overlay closes.
- Soften desktop hover: no scale jump, ~9 px lift, gentle rotation settling and slower shadow transition.
- Align screen/focus/navigation transitions on shared motion tokens and easing curves.
- Preserve the existing mobile Tinder-style swipe flow, voting, curation and media preview behavior.
- Respect `prefers-reduced-motion`.

### Regression recovery included in this build
- Restore the stack curation actions (`Titel vorschlagen`, `Lieblingsmomente wählen` / `Punkte ändern`, `Ergebnis ansehen`, owner-only `Stapel auflösen`).
- Voting/result state now outranks a stale review counter, so a completed vote cannot disappear behind an outdated `Noch X Karten ...` state.
- Replace the misleading per-card `Noch X Karten gemeinsam ansehen` overview copy with stable, human-readable process states.
- Reload persisted review/vote summaries when leaving the spread so the overview reflects the cloud state immediately.
- Keep curation buttons stationary on hover/tap; coarse-pointer devices no longer consume the first tap as a sticky hover state.
- Enforce one shared desktop spread-card size in every selection/result state.

No database migration or Edge Function is introduced in this build.
