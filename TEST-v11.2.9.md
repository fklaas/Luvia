# Regression tests Luvia 11.2.9

- Sign in and open Restaurants: no `app-gateway` null error.
- Search for `Pasta Restaurant`: request must not remain at HTTP 401; one automatic refresh retry is allowed.
- Edit a trip and set country to `Frankreich`; reload and verify it remains.
- Save only title/accent and verify destination name, country, Place ID and coordinates remain unchanged.
- Verify all diagnostics show Build 11.2.9 / Core 3.0.2.9.
