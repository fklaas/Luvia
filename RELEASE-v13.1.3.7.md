# Luvia 13.1.3.7 – Schedule Permission & Stable Hydration

- behebt fehlende PostgREST-Tabellenrechte für `trip_schedule_events`
- verhindert 403-Fehler und wiederholte Gateway-Fallbackschleifen
- hydriert den letzten stabilen Tagesplan bereits vor vollständigem Trip-Boot
- behandelt Local-Storage-Einträge nach einem Reload nur noch als Cache, nicht als autoritative Optimistic Writes
- persistente Supabase-Zeitwerte haben Vorrang vor alten Restaurant- und Cache-Zeiten
