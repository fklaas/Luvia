# Core V2.12.4 – Restaurant Experience

Diese Version entwickelt die bestehende Destination-Aware Restaurant Search zu einer vollständigen Erlebnisoberfläche weiter. Sie führt keinen zweiten Datenpfad ein.

## Architekturpfad

`Restaurant UI → LuviaRestaurants → LuviaPlaces → luvia-gateway → Google Places → Restaurant Import RPC`

## Match-Score

Der aktuelle Score ist eine nachvollziehbare lokale Heuristik aus Bewertung, Bewertungsmenge, Entfernung sowie bestätigten Restaurantmerkmalen. Er ist ausdrücklich die UX-Grundlage für die spätere Restaurant Intelligence und noch kein lernendes Nutzerprofil.

## Experience-Tags

Tags werden ausschließlich aus vorhandenen Google-Daten, Kategorien, Feature-Feldern und klaren Textsignalen erzeugt. Unbestätigte Eigenschaften wie Kinderwagenfreundlichkeit werden nicht behauptet.
