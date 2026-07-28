# Test · Build 13.0.2

1. Open `/intelligence/console.html#places`.
2. Expect Core 4.0.2 / Build 13.0.2 and 21 ready services.
3. Place diagnostics must show Timeline `ready` and Presence `ready`.
4. Press “GPS-Erkennung starten” and grant location permission.
5. A Place must have coordinates and belong to the active trip.
6. Expected state flow: nearby → arrived → stay_detected → visited → left.
7. After a verified stay, `LuviaPlaceCore.getPlace(id).lifecycle` is `visited`.
8. `LuviaTimelineCore.list({placeId:id})` contains automatic arrival, visit and departure events.
9. Denied location permission is a controlled state, not an unhandled exception.
