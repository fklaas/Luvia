# Luvia v13.28.7.2 / Core v4.28.7.2

## Places Niche-Relevance & Destination Normalization Correction

- Doppelte Zielorte werden aus freien Suchtexten entfernt.
- `Fallschirmspringen in München München` wird intern zu `Fallschirmspringen` + Destination `München` normalisiert.
- Nischen-Intents verwenden keine allgemeinen Kategorievarianten wie `Aktivität`, `Erlebnis` oder `Freizeit` mehr.
- Der Intent-Vertrag übergibt Match- und Ausschlussmuster an das Gateway.
- Das Gateway verwirft bei Nischensuchen Ergebnisse ohne belastbaren Intent-Bezug bereits vor der Rückgabe.
- Google und Foursquare bleiben parallel aktiv; Providerfehler bleiben voneinander isoliert.

## Ursache Hofbräuhaus

Foursquare erhielt eine breite Suchkaskade und lieferte populäre Orte rund um den Münchner Suchanker. Da serverseitig bislang nur Entfernung, Bewertung und allgemeine Filter angewendet wurden, konnte ein populärer, aber thematisch unpassender Ort wie das Hofbräuhaus in der Rohantwort verbleiben. Der neue Build erzwingt bei Nischen-Intents einen Treffer auf Name, Kategorien oder Beschreibung.
