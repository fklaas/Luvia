# Luvia 13.6.4 / Core 4.6.4

## Canonical Place Module Shell Closure

Build 13.6.4 removes the remaining visual and structural deviations of the Attractions module.

### Global shell contract

Attractions now uses the same shared building blocks as Accommodations:

- `LuviaPlaceExperience.plannedPanel`
- `LuviaPlaceExperience.discovery`
- `LuviaPlaceCollections.favoritePanel`
- `LuviaPlaceUI.card`
- `LuviaPlaceUIActions.openTimelineDialog`

The Place UI Contract now exposes the required module-shell and card-action templates. The Conformance service checks these requirements for contract-driven modules.

### Attractions UI

- canonical Places header
- canonical planned section
- canonical discovery and search form
- canonical recommendation result grid
- canonical collapsible favorites collection
- canonical favorite cards including provider photos
- canonical load-more and empty/loading states

### Planning dialog

The contract-driven Timeline dialog now has a stable global layout with a correctly positioned close button, non-overlapping labels, responsive actions and one-column date fields.

### Version

- App: 13.6.4
- Core: 4.6.4
- PWA cache: `luvia-shell-v13.6.4`
