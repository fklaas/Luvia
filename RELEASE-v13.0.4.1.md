# Luvia Core 4.0.4.1 · Build 13.0.4.1

## Schedule Removal Hotfix

- Fixes removal of planned restaurant moments by resolving the canonical trip-place UUID instead of using a generated schedule-event ID.
- Allows empty planning fields to reach the lifecycle RPC so `planned_date` and `planned_time` are actually cleared.
- Moves the remove action into the top-right corner of each restaurant-moment card.
- Keeps universal Schedule Intelligence removal and immediate dashboard refresh intact.
