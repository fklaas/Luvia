# Regression tests · Luvia 11.2.12

1. Delete browser data, sign in and create a new trip. No `NOT_TRIP_OWNER` error may occur.
2. Confirm the new `trip_members` row has role `owner`.
3. Confirm `trip_settings` contains destination, country, dates, symbol and accent.
4. Reload and verify the trip remains active.
5. Sign in in incognito and verify all trip fields are loaded from Supabase.
6. Edit the trip and verify the save button persists changes.
7. Developer and diagnostics pages show Build 11.2.12 / Core 3.0.2.12.
