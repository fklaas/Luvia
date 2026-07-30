# Luvia 13.7.0 / Core 4.7.0

## Global Place Runtime & Conformance Closure

- zentraler `LuviaPlaceRuntime` als einziger UI-Snapshot pro Reise
- zentrale `LuviaPlaceCommands` für Favoriten und Timeline-Schreibvorgänge
- Restaurant, Unterkunft und Sehenswürdigkeit werden von denselben Shell-, Card-, Collection- und Action-Services gesteuert
- Conformance prüft Restaurants nun genauso streng wie alle anderen Place-Module
- lokale Favoriten-Writer und direkte Style-Mutationen werden als Architekturverstoß erkannt
- statischer Regressionstest für alle Place-Module
- Pflichtarchitektur-Dokumentation erweitert

Keine SQL-Migration und kein Edge-Function-Deployment erforderlich.
