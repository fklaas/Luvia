# Test 13.0.2.1

1. Open an active trip and the Restaurants module.
2. Open a discovered restaurant.
3. Use Save, Favorite, Day plan, Reserved and Visited individually.
4. Verify the existing restaurant UI still updates.
5. For Visited, verify a `place_visited` timeline event exists.
6. In console, inspect `LuviaPlaceCore.diagnostics()` and confirm restaurant normalization increased.
7. Use the canonical ID returned by the UI event or Place Core; do not enter the literal placeholder `PLACE_ID`.
