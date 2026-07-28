# Luvia Core 4.0.0 · Build 13.0.0

## Place Intelligence Foundation

- Universelles Place-Domain-Modell mit elf Basistypen, Multi-Type-Rollen, Capabilities und gemeinsamem Lifecycle.
- Zentrale `LuviaPlaceCore` API und `LuviaPlaceRegistry` mit echten Readiness-Zuständen.
- Restaurant Adapter als Compatibility Layer auf bestehenden Restaurant-Entities; bestehende IDs und Oberflächen bleiben erhalten.
- Basisadapter für zehn weitere Typen melden transparent `registered_without_source_data`.
- Datenbankmigration erweitert die vorhandene `places`-Tabelle und bereitet `place_visits` für Build 13.0.2 vor.
- Developer Console zeigt Place Core, Registry, Adapterstatus und Restaurant-Mapping.

## Migration correction
The restaurant backfill resolves the canonical place through `restaurants.trip_place_id -> trip_places.place_id`. The `restaurants` table does not contain a direct `place_id` column.
