# Luvia 13.27.4 – Places Lifecycle Schema Compatibility

- entfernt nicht vorhandene `place_visits.trip_place_id`- und `metadata`-Felder aus Lesen und Schreiben
- ordnet Besuche über die kanonische `place_id` zu
- nutzt bei nicht erreichbarem Gateway eine direkte Supabase-Lesung von `trip_places` und `places`
- behandelt die Legacy-Lifecycle-Synchronisierung nach erfolgreichem Timeline-/Visit-Write als nicht blockierend
- verhindert, dass ein Gateway-Ausfall „Meine Orte“ vollständig unbenutzbar macht
