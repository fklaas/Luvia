# Luvia Release 13.4.4.1

## Timeline Overlay Navigation Fix

- Timeline actions are aligned directly beneath each place card and remain compact on desktop and mobile.
- The date/time editor is a singleton; duplicate stacked overlays are removed before opening.
- Missing place icons no longer render as `undefined`.
- Opening a place from the timeline uses an overlay-only portal and keeps the dashboard timeline open underneath.
- Closing the place detail returns to the existing timeline modal instead of navigating to an empty Places view.

## Architecture

The timeline requests place details with `overlayOnly: true` and `returnView: timeline`. The App Shell mounts the required place module in a hidden transient portal, opens the canonical place detail overlay, and removes the portal when the overlay closes. No alternate detail card was introduced.

## Backend

No SQL migration, Edge Function deployment, or new secret is required.
