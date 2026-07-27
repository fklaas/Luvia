# Regression tests Luvia 11.2.8

- Create a trip through a Places suggestion and verify that country and country code are stored.
- Open trip editing and verify that “Land oder Region” is populated after reload and on a second device.
- Search for “Pasta Restaurant” and “vegetarische Restaurants” in the restaurant module; results must match the active destination.
- Compare the restaurant module with Backend Explorer using the same query and destination.
- Reload repeatedly; destination name, country, Place ID and coordinates must remain unchanged.
- Simulate an incomplete cloud destination response; valid cached fields must remain intact.
- Confirm all diagnostics show Build 11.2.8 / Core 3.0.2.8.
