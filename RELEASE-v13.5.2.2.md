# Luvia Build 13.5.2.2 / Core 4.5.2.2

## Place favorites, timeline media and viewport stability

- Restaurant favorite cards now use the same global card treatment and trip-accent favorite action as accommodation favorites and discovery cards.
- Timeline place opens use the universal place detail overlay instead of the legacy restaurant workspace, except for explicit schedule editing.
- Place details and first media are warmed on timeline-day hover/focus and when the day popup opens.
- Shared detail preparation now deduplicates and caches both Google Place details and resolved photo URLs.
- Restaurant and accommodation detail overlays reuse prepared media instead of resolving the same photos again.
- Timeline days no longer keep a transform on keyboard/touch focus; desktop hover is a single subtle lift.
- Returning to the browser tab preserves the exact page scroll position while cloud data refreshes.

No SQL migration, Edge Function deployment or new secret is required.
