# Luvia 12.0.0 · Core 3.8.0

## Restaurant Intelligence

Dieser Release macht die bisherige Recommendation Foundation im normalen Restauranterlebnis sichtbar.

### Restaurantkarten und Suchtreffer

- erklärbarer Match-Wert
- Entfernung zum freigegebenen Nutzerstandort
- heutiger Öffnungsstatus
- empfohlene Besuchszeit
- Reservierungshinweis
- Baby- und Kinderkontext
- Budgethinweis

### Restaurantdetail

- „Warum passt das zu euch?“
- „Was spricht dagegen?“
- empfohlene Besuchszeit
- Entfernung sowie geschätzte Geh- und Fahrzeit
- Gruppen-Match
- Einzelbewertungen der Reiseteilnehmer
- Reservierungshinweis
- bis zu drei kontextbezogene Alternativen
- konkrete nächste Schritte wie Reservieren oder rechtzeitig Losgehen

### Dashboard

Neues Widget „Restaurant Intelligence“ mit:

- Restaurant für heute
- Jetzt in eurer Nähe
- Reservierung fehlt noch
- Abfahrts-Countdown beziehungsweise beste Besuchszeit
- bessere Alternative verfügbar

### Architektur

Neu ist der modulunabhängig angebundene Core-Service:

`window.LuviaRestaurantIntelligence`

Er konsumiert Travel Context, Travel Preferences, Places, Restaurants und die Smart Recommendation Engine. Es entsteht keine parallele Restaurant-Datenhaltung.
