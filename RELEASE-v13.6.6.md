# Luvia 13.6.6 / Core 4.6.6

## Restaurant Module Registration Closure

- Behebt `ReferenceError: VERSION is not defined` beim Mounten des Restaurantmoduls.
- Die Modulregistrierung verwendet jetzt verbindlich `MODULE_VERSION`.
- Restaurantmodul und globaler Core melden Version 4.6.6.
- Neue verpflichtende Root-Dokumentation `00_UNBEDINGT_IMMER_LESEN_PLACES_ARCHITEKTUR.md` beschreibt die vollständige globale Places-Architektur, Technik, Services, Shells, UI-, Design-, Timeline-, Favoriten-, Boot-, Realtime-, Performance- und Conformance-Verträge.

## Regression

- Restaurantmodul muss wieder ohne leere Fläche öffnen.
- Unterkünfte und Sehenswürdigkeiten bleiben unverändert verfügbar.
- Globale Place-Conformance ausführen.
