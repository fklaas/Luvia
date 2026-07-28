# Test checklist · Build 13.0.1

1. Open Luvia and select a trip with a destination.
2. Open Restaurants.
3. Search for a restaurant.
4. Expect the shared Place Card layout with type, lifecycle, match, distance, opening status, best time, baby and budget badges.
5. Open “Warum passt das?”.
6. Expect the existing detail view, reasons, constraints, group score, schedule and lifecycle actions.
7. Save or favorite a restaurant.
8. Reopen Restaurants and expect the saved Place Card to use the same visual language.
9. Open Developer Console → Places.
10. In `LuviaPlaceCore.diagnostics()` expect `ui.status = ready`, version `4.0.1`, and `restaurants` in `migratedModules`.
