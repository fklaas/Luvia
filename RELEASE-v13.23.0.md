# Luvia 13.23.0 – Candidate Research Engine

Der bestätigte Planning Dialogue startet erstmals eine kontrollierte Kandidatenrecherche. Places verwendet ausschließlich den kanonischen `LuviaPlaceEntities`-/Gateway-Pfad. Move löst Mobilitätsziele über denselben Provider-Core auf und ergänzt, falls eine Startposition verfügbar ist, eine Route.

## Regeln
- Recherche erst nach ausdrücklicher Bestätigung.
- Provider-Kandidaten bleiben intern, bis Mindest-Evidence erfüllt ist.
- Deduplizierung nach Provider Place ID.
- maximal fünf Places- und drei Move-Kandidaten.
- keine Timeline- oder Favoritenänderung.
- kein automatischer Katalog-Fallback.
- bei zu geringer Qualität wird ehrlich eine leere Auswahl angezeigt.

## UI
13.23.0 zeigt einen Candidate Workspace, noch nicht das finale Journey Planning Deck. Der Nutzer sieht reale Kandidaten, Evidence und Unsicherheiten. Auswahl, Kombination und Tagesplan folgen im nächsten Composer-/Deck-Baustein.
