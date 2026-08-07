# Luvia 13.36.9 · Core 4.36.9

## Memory Deck Layout Recovery & Canonical Trip Accent

Recovery build for the Memory Deck after 13.36.8.

### Runtime changes
- Desktop spread replaced with distributed anchor-pattern composition instead of free clustering.
- Maximum intended overlap budget tightened to 10% for up to 6 cards and 13% for larger decks.
- Random jitter remains, but every card starts from a distinct stage anchor so the full stage is used.
- Single-author deck palette now resolves the active `--trip-accent` already applied by LuviaTheme/dashboard before all other sources.
- Theme changes trigger Memory rerender so an edited trip accent is reflected without stale palette state.
- Closed single-author decks use the travel accent for every backing layer and stronger visible accent borders.
- Mobile throw deck now exposes up to four physical card layers behind the active card while retaining Tinder-style drag/throw physics.
- Desktop hover lift remains soft and visible.

### Scope
No schema migration and no Edge Function change.
