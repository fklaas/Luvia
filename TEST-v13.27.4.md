# Test 13.27.4

1. Meine Orte öffnen: keine Meldung `column place_visits.trip_place_id does not exist`.
2. Als besucht markieren: POST `place_visits` ohne `trip_place_id`, Status 201/200.
3. Filter Besucht: Ort erscheint nach Cloud-Refresh.
4. Zur Timeline: Datum/Uhrzeit speichern und unter Geplant sowie Heute prüfen.
5. Gateway testweise nicht erreichbar: Meine Orte lädt über direkte Supabase-Lesung.
