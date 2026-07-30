# Luvia 13.6.8 · Core 4.6.8

## Global Favorite Collection State Closure

- `Alle entfernen` nutzt nun die bereits gerenderten kanonischen `tripPlaceId`-Werte und ist nicht mehr von einem zusätzlichen `place.list`-Gateway-Aufruf abhängig.
- Globale Favoriten-Sammellöschung aktualisiert Cloud, Collection Shell und Discovery-Karten über ein einziges zentrales Event.
- Restaurantkarten verlieren ihren Favoritenstatus unmittelbar nach einer Sammellöschung.
- Die verbindliche Places-Architekturdatei dokumentiert die globale Regel für alle aktuellen und zukünftigen Place-Typen.
