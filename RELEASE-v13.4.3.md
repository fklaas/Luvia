# Luvia 13.4.3 – Authoritative Timeline & Universal Place Data

- Timeline zeigt nur geplante Cloud-Schedule-Einträge und gültige GPS-Besuche verknüpfter Reise-Places.
- GPS-Besuche benötigen mindestens fünf Minuten und Status `visited` oder `left`.
- Teilnehmername wird bei GPS-Einträgen angezeigt.
- Check-in zeigt den Aufenthalt bis zum zugehörigen Check-out statt einer künstlichen 30-Minuten-Dauer.
- Timeline-Einträge öffnen die Place-Detailkarte; Schedule-Datum und -Uhrzeit können direkt im Timeline-Fenster geändert werden.
- Änderungen werden direkt in Supabase gespeichert und im aktuellen Fenster über Realtime/Events aktualisiert.
- Unterkunftsübersicht zeigt Datum und Uhrzeit.
- Dashboard-Widgets wachsen nicht mehr gegenseitig in die Höhe.
- Neue universelle Tabelle `trip_place_data` bündelt typabhängige Place-Felder als Cloud-Vertrag.
