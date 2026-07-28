# Test checklist · Build 13.1.0

## Today card
- Open a trip with no events: the card shows an open-day state and discovery actions.
- Plan one event today: it appears as next with departure advice.
- Plan multiple events: timeline is chronological and upcoming items are visible.
- Use overlapping times: a hard conflict is displayed.
- Use a short transition: a tight-plan warning is displayed.
- Verify free time between events is calculated.
- Keep the dashboard open and change the plan: the card updates without reload.

## Diagnostics
- Service `today-intelligence` is ready.
- `LuviaTodayIntelligence.diagnostics()` returns status, timeline, departure, free windows and conflicts.
- Core smoke tests report 12/12 successful.
- PWA service test succeeds in diagnostics mode with a skipped-runtime-registration note.
