# Luvia 13.37.7 · Core 4.37.7

## Memory Deck Consistency, Realtime Voting & Story Card Rework

Basis: Luvia 13.37.6 · Core 4.37.6.

### Implemented
- One fixed physical desktop card box for the spread and post-discovery reveal. Photo, story and moment cards no longer change the outer deck height.
- Opening and closing use the same center-to-position / position-to-center choreography with reverse staggering.
- Added realtime subscription for `memory_card_album_reviews`. Review completion from another traveler refreshes stack state immediately and can expose voting without reload/reopen.
- Existing vote realtime remains active; completed voting continues to move all clients to the result state.
- Reworked non-photo presentation: raw vibe/reaction rows remain persisted but are composed per traveler into contextual Moment Cards instead of being shown as separate thin cards.
- If a traveler already has a Story Card, vibe/reaction become story context rather than extra standalone cards.
- Story cards use the actual authored story as primary content and can show the recorded feeling/reaction as compact context.
- User-facing labels now prefer `Geschichte` and `Moment` over raw technical memory-card types in curation/voting surfaces.
- Technical HERO/STORY/SIGNAL footer stamps remain hidden.

### Data model
No raw Memory Card is deleted or rewritten by the new composition layer. `memory_cards` remains source-of-truth. The new Story/Moment composition is a presentation/curation projection over existing rows.

### Backend
No new migration is required for 13.37.7. The existing 13.36.10 review migration already adds `memory_card_album_reviews` to Supabase Realtime, and 13.37.0 already permits trip members to read the shared review evidence.
