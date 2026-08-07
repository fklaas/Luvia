# Test Plan · Luvia 13.37.7

## Automated/static checks
- JavaScript syntax for changed runtime files.
- App/Core/cache/force-update version consistency.
- Local asset references from `index.html`.
- CSS brace balance.
- Review Realtime subscription exists and is mounted/unmounted with the Memory view.
- Vote Realtime subscription remains present.
- Experience composition hides standalone vibe/reaction duplicates while preserving raw rows.
- Desktop spread and reveal share a fixed physical card height.
- Opening/closing motion uses the same center vectors with forward/reverse stagger.
- ZIP integrity.

## Manual checks after deployment
- Real two-user Supabase Realtime transition from review-complete -> voting-ready.
- Real two-user vote-complete -> result-ready transition.
- Visual equality of card boxes at common Windows scaling levels and laptop widths.
- Opening and closing choreography with 4, 7, 10+ cards.
- Story/Moment content quality with real trip data.
- Mobile Tinder swipe regression check.
- Voting photo lightbox regression check.
