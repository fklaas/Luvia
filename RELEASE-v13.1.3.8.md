# Luvia 13.1.3.8 – Schedule Deletion Consistency

- Gelöschte Restaurant-Planungen werden anhand aller Place-Identitäten aus Schedule, Cache und Supabase entfernt.
- Tombstones verhindern, dass verzögerte Restaurant- oder Realtime-Daten gelöschte Termine erneut einblenden.
- Gespeicherte Restaurants und Sammellöschungen entfernen zugehörige Tagesplaneinträge.
- Vorschlagsbasierte Termine lassen sich nachträglich als bestehende Planung öffnen.
- Wiederholte Recommendation-Tracking-400 werden gedrosselt.
