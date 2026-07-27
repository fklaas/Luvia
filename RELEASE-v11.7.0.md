# Luvia 11.7.0 · Core 3.5.0
## Live Travel Context & Restaurant Lifecycle Foundation

Dieses Release führt den zentralen Live-Reisekontext und den vollständigen Restaurant-Lebenszyklus als wiederverwendbare Core-Grundlage ein.

### Enthalten
- aktueller Tag, Wochentag, Reisephase und Reisetag als zentrale Core-Daten
- freiwillige Standortfreigabe mit laufender Aktualisierung
- echte Entfernung vom Nutzer zu Restauranttreffern und gespeicherten Restaurants
- Countdown bis zu geplanten Restaurantbesuchen
- Restaurant-Lebenszyklus: entdeckt, gespeichert, favorisiert, geplant, reserviert, besucht, bewertet, Erinnerung, Reisebuch
- dauerhaft gespeicherte Statushistorie und Aktivitätsereignisse
- Datenfelder für Notizen, persönliche Bewertung, Besuchszeit-Empfehlung, Match Score und Empfehlungsgründe
- Speicherung angenommener und abgelehnter Empfehlungen als Grundlage für spätere Personalisierung
- erklärbarer Match Score mit „Warum passt das zu euch?“
- lesbare Schaltflächen in der Restaurant-Detailansicht
- fehlertolerante Activity-Feed-Anzeige während noch ausstehender Migrationen

### Architektur
`LuviaTravelContext` ist bewusst ortstypunabhängig. Hotels, Sehenswürdigkeiten, Fotospots, Parkplätze und weitere Places können dieselbe Uhrzeit-, Reisephasen-, Standort-, Entfernungs- und Countdown-API verwenden.
