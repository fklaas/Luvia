# Luvia 13.27.3 – Places Lifecycle Persistence & Request-Storm Fix

## Behoben
- manueller Besuch schreibt ohne nicht vorhandenen `ON CONFLICT`-Constraint
- Besuchsdatensatz enthält `trip_place_id` und eine minimale bestätigte Aufenthaltsdauer
- Lifecycle-Hub lädt nur noch einmal gleichzeitig und startet keinen Event-Refresh-Loop
- Lifecycle-Resolver liest seine drei Cloud-Quellen direkt, ohne die gesamte Timeline rekursiv zu hydratisieren
- Timeline-Planung funktioniert auch für Place-Typen ohne eigenes historisches Timeline-Feld über `planned_at`
- „Zur Timeline“ in „Meine Orte“ öffnet direkt den globalen kanonischen Planungsdialog
