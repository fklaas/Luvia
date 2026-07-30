# Test Plan 13.6.4

1. Open Restaurants, Accommodations and Attractions and compare header, planned area, discovery area and collection shell.
2. Add two Attractions as favorites and verify identical cards, images and action alignment.
3. Search Attractions, use a quick category and load six more results.
4. Open an Attraction detail and select `Zur Timeline`.
5. Verify that the planning dialog has no overlap on desktop and mobile.
6. Save the date/time and verify the entry in the module and dashboard calendar.
7. Run `await LuviaPlaceConformance.runAll()` and verify `ok: true`.
