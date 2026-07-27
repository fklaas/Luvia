LUVIA 9.19.3 · CORE V2.12.2 · RESTAURANT ENTITY SCHEMA
========================================================

Dieser Schritt erweitert die bestehende Datenbankstruktur für die Restaurant
Entity Pipeline. Es werden keine neuen Haupttabellen angelegt.

Neue Spalten:
- trip_places.planned_date
- trip_places.planned_time
- restaurants.reservation_name
- restaurants.reservation_url
- restaurants.reservation_notes
- restaurants.menu_url

Zusätzlich enthalten:
- Indizes für geplante Orte und Reservierungen
- RLS-Prüfung für places, trip_places und restaurants
- Diagnose-RPC luvia_restaurant_entity_schema_status()
- Browser-Test window.LuviaRestaurantSchemaTest.run()

Ausführung:
1. Supabase Dashboard öffnen.
2. SQL Editor öffnen.
3. Datei supabase/migrations/20260726_003_core_v2_12_2_restaurant_entity_schema.sql ausführen.
4. Danach die Diagnoseseite neu laden.

Alternativ über die Supabase CLI:
  npx supabase db push

Für diesen Schritt ist kein Edge-Function-Deploy erforderlich.
