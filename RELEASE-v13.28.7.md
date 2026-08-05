# Luvia 13.28.7 / Core 4.28.7 – Multi-Provider Places Foundation

- Google Places und Foursquare laufen serverseitig hinter demselben Places Gateway.
- Ergebnisse werden in ein gemeinsames Luvia-Place-Modell normalisiert und dedupliziert.
- Provider-Ausfälle werden isoliert; ein funktionierender Provider kann weiterhin Ergebnisse liefern.
- Profil-Kompass und Suchintent werden an den Gateway-Kontext übergeben.
- Empfehlungen zeigen nachvollziehbare Gründe und Datenquellen.
- Foursquare-Schlüssel bleibt ausschließlich als Supabase Edge-Function-Secret gespeichert.
