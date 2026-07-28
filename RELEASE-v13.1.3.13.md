# Luvia Core 4.1.3.13 · Build 13.1.3.13

## Cloud-Authoritative Schedule

Die gesamte operative Tagesplanung nutzt ab diesem Build ausschließlich `public.trip_schedule_events` als autoritative Datenquelle. Lokale Schedule-, Today- und Live-Day-Snapshots werden weder gelesen noch geschrieben.

### Behoben

- Termine verschwinden nach Reload nicht mehr wegen konkurrierender lokaler Snapshots.
- Zeitänderungen werden erst nach bestätigter Cloud-Persistenz angezeigt und anschließend aus der Cloud neu geladen.
- Gleichnamige Filialen, etwa McDonald's Meppen und McDonald's Haren, bleiben getrennte Places. Titel werden nicht mehr als Identität oder Deduplizierungsschlüssel verwendet.
- Realtime-Änderungen der Schedule-Tabelle lösen einen deterministischen Cloud-Refresh aus.
- Dashboard und Today Intelligence werden erst nach der initialen Cloud-Hydration gerendert.
- Restaurantmomente übernehmen ausschließlich den zentralen Cloud-Schedule.

### Architektur

Identitätsreihenfolge: `trip_place_id` → `provider_place_id` → `place_id` → `source_key`. Namen sind ausschließlich Anzeigeinformationen.
