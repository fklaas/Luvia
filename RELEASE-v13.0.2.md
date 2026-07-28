# Luvia Core 4.0.2 · Build 13.0.2

## Timeline & GPS Visit Detection

Build 13.0.2 introduces the canonical Timeline Core and the central Presence & Visit Core. Places with coordinates can now pass through nearby, arrived, stay_detected, visited and left states. A verified stay marks the canonical Place lifecycle as visited and creates automatic timeline events. Manual visit confirmation remains available through `LuviaPlaceCore.recordVisit(placeId, patch)`.

GPS monitoring is opt-in and starts only after an explicit user action. Browser/PWA background execution remains platform-dependent; a native wrapper will be required for reliable always-on background geofencing.
