# Luvia 11.2.10 · Core 3.0.2.10

## Stable Module Instance & Destination Preservation

- Restaurant search controls remain in the same mounted module instance.
- Module Manager compares persisted module content structurally instead of by transient object identity.
- Generic trip context emissions no longer rerender the restaurant search UI.
- Legacy mirror hydration reads the structured `destinationModel`, preserving country, Place ID and coordinates after reload.
- All active runtime and diagnostics versions updated together.
