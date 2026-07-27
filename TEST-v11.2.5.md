# Regression tests · Luvia 11.2.5

1. Sign in with an account that already owns a trip. The previous active trip must remain selected.
2. Reload the page twice and reopen the PWA. The active trip must not disappear.
3. Create a new trip and enter `Paris`. Places suggestions must appear and be selectable.
4. Complete the trip creation and verify that country, place ID and coordinates remain available.
5. Open Restaurants. Search field, quick filters and options must be visible immediately.
6. Search and select multiple filters. The module must remain mounted and retain its current instance.
7. Temporarily block the gateway. The restaurant module must show a destination status instead of a blank area.
8. Test the same account on a second device. Cloud trips must load and one trip must be selected deterministically.
9. Confirm there is no anonymous sign-in action.
10. Verify Developer Console Backend diagnostics and Places health.
