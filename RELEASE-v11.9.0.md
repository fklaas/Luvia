# Luvia 11.9.0 · Core 3.7.0 — Smart Recommendation Engine Complete Foundation

## Neu
- eigenständiger Core-Service `LuviaRecommendations` in Version 3.7.0
- Group Context mit Teilnehmerprofilen, harten Anforderungen und fairem Gruppen-Match
- Candidate Provider Registry zusätzlich zur Domain Adapter Registry
- zentrale, erweiterbare Hard-Constraint-Pipeline
- Explainability Contract mit Gründen, Warnungen, Constraints, Gruppen-Match und Regelversion
- vollständige Recommendation-Ereignisse für shown, opened, accepted, rejected und converted
- persistente Recommendation Events, Recommendation Memory und Runtime Settings
- kontrollierbare Engine-Einstellungen und Testkontext in der Developer Console
- Score Inspector, Constraint Registry und Decision Log
- Restaurant-Adapter als Referenzimplementierung

## Architektur
Die Engine ist modulunabhängig. Zukünftige Hotels, Sehenswürdigkeiten, Fotospots, Shopping- und Aktivitätsmodule registrieren Candidate Provider und Adapter, ohne die zentrale Engine zu verändern.
