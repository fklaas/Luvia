# Luvia 13.1.3.12 – Suggestion Persistence & Restaurant Linking

Behebt die Foreign-Key-Fehler beim Übernehmen von Today-Vorschlägen. Restaurantvorschläge werden zuerst produktiv importiert und erst anschließend mit stabilen Trip-Place-Identitäten in den universellen Tagesplan geschrieben. Bereits eingeplante Orte werden aus weiteren Vorschlägen ausgeschlossen. Schedule-only-Restauranttermine können beim Öffnen nachträglich mit dem produktiven Restaurantdatensatz verbunden werden. Die primären Restaurantaktionen wurden an die Luvia Design Language angepasst.
