# Luvia Build 13.4.2 – Cloud Timeline Core 5

- Timeline vollständig neu als cloudautoritärer Aggregator aufgebaut.
- Direkte Zusammenführung von `trip_schedule_events`, `timeline_events` und `place_visits`.
- Keine lokale fachliche Persistenz.
- Neue Kalenderkarte im Dashboard mit markierten Reisetagen und Tages-Popup.
- Supabase Realtime für Planänderungen und GPS-Besuche.
- Unterkunftsspeichern schließt die Detailkarte nach erfolgreicher Cloud-Persistenz.
- GPS-Besuchserkennung nach mindestens fünf Minuten Aufenthalt.
