# Luvia 13.2.0.1 – Cloud-Only Place Core Verification Fix

Core 4.2.0.1 · Build 13.2.0.1

## Änderungen

- Schedule Intelligence verwendet für fachliche Termine ausschließlich `trip_schedule_events` in Supabase.
- Lokale Schedule-Snapshots und lokale Tombstones wurden aus dem produktiven Datenfluss entfernt.
- Timeline-Ereignisse werden ausschließlich aus `timeline_events` geladen und dort geschrieben.
- Place Visits werden ausschließlich aus `place_visits` geladen und dort geschrieben.
- Today Intelligence und Live Day Companion verwenden keine fachlichen Browser-Snapshots mehr.
- Der allgemeine Data Layer besitzt keine dauerhafte Browser-Queue mehr. Fehlende Cloud-Verbindung führt zu einem sichtbaren Fehler statt zu einer scheinbar erfolgreichen lokalen Änderung.
- Restaurant-Reiseauflösung verwendet keine Legacy-Trip-Registry aus `localStorage` mehr.
- Gleichnamige Orte werden nicht mehr über den Titel zusammengeführt. Stabile Place-, Trip-Place- und Provider-IDs sind maßgeblich.
- Neue Diagnose-API: `LuviaCloudOnlyPlaceVerification.run()`.

## Architekturregel

Supabase ist die einzige dauerhafte fachliche Wahrheitsquelle. In-Memory-Zustand darf die UI während einer laufenden Sitzung beschleunigen, wird aber niemals als persistenter Ersatz für Cloud-Daten verwendet.
