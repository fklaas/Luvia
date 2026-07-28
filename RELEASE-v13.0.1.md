# Luvia Core 4.0.1 · Build 13.0.1
## Unified Place UI

Build 13.0.1 introduces the first shared visual layer for universal Places. The shared `LuviaPlaceUI` renders cards, type and role badges, match information, lifecycle state and explainable recommendation assessments. The existing restaurant discovery and saved-restaurant cards now delegate their visual structure to this shared UI while retaining the established restaurant data, recommendation, schedule and action flows.

### Finished
- Shared Place Card and badge components for all eleven Place types.
- Shared lifecycle presentation.
- Shared “Warum passt das?” / constraints assessment.
- Restaurant search-result cards migrated to `LuviaPlaceUI`.
- Saved restaurant cards migrated to `LuviaPlaceUI`.
- Existing restaurant detail data, actions, intelligence and schedule integration preserved.
- Place UI diagnostics exposed through Place Core.

### Prepared
- Reuse by accommodation, attraction, activity and other future modules.
- Fully generic Place Detail shell and dashboard recommendation slots.

### Not part of this build
- GPS visit detection and automatic timeline events.
- Cross-module recommendation chains.
- New productive data sources for the ten non-restaurant adapters.
