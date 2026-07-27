# Core V2.12.3.1 – Destination-Aware Restaurant Search

## Architektur
`destination.resolve` fordert fünf Google-Text-Search-Kandidaten an. Kandidaten werden nun deterministisch priorisiert: locality, administrative_area_level_2, administrative_area_level_1, postal_town, country. Ein davon abweichender POI-/Touristen-Kandidat wird optional als Landmark-Kontext gespeichert.

`primaryType` liegt als Feld im Destination Context. Viewport wird als `{south, west, north, east}` normalisiert. Der Radius wird aus dem entferntesten Viewport-Eckpunkt mit Faktor 1,35 berechnet und zwischen 5 und 50 km begrenzt.

Schema 5 ergänzt `canonicalCity` und `landmarkContext`. Die bisherige `center`, `viewport` und `searchRadiusMeters`-Struktur bleibt kompatibel.

## Gateway-Filter
Direkt an Google: `includedType`, `openNow`, `minRating`, `priceLevels`, `locationRestriction`, `locationBias`, `rankPreference`, `maxResultCount`.
Nachgelagert: `vegetarianOnly`, `minUserRatingCount`, `maxDistanceMeters`; Sortierung `distance`, `rating`, `reviews`.
