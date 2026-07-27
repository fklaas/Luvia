# Luvia 11.2.11 · Core 3.0.2.11

## Cloud Trip Profile
- Destination, country, country code, Place ID, coordinates, start date and end date are persisted in `trip_settings` for every trip.
- New trip creation fails visibly if the complete Supabase profile cannot be saved.
- Trip editing writes to Supabase before the local cache is changed.
- Existing complete device data can repair an incomplete cloud profile once.

## Reliable module mount
- A module without an existing DOM root is no longer marked as mounted.
- The module manager waits for the view container and mounts Restaurants automatically after dashboard navigation.
- Promise-based module renders are completed before final mounting.
