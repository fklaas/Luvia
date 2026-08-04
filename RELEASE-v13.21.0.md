# Luvia 13.21.0 – Planning Foundation Reset

## Ziel
Der experimentelle Conversational-Discovery-Zweig ist nicht mehr der primäre Flow. Places und Move starten nun eine eigenständige Planning Session.

## Umgesetzt
- neue `LuviaPlanningSession` mit Goals, Constraints, Präferenzschichten, Entscheidungen, Ablehnungen, Candidate Sets und Draft Plan
- neue `LuviaPlanningTools` Registry mit expliziten Legacy-Adaptern
- neue `LuviaPlanningFoundation` UI
- Places und Move lösen keine automatische Suche und kein KI-Ranking mehr aus
- bestehende kanonische Places-/Move-Cores bleiben ausschließlich als bewusst geöffneter Katalog erhalten
- Sessiondaten sind kurzlebiger UI-/Arbeitszustand und werden nur in `sessionStorage` gehalten; Place-Domain-Daten bleiben Cloud-only

## Bewusst noch nicht enthalten
- Goal Decomposition
- KI-Rückfragen
- Candidate Research
- Journey Composer
- automatische Timeline-Änderungen
