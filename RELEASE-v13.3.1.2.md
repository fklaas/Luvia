# Luvia Build 13.3.1.2 — Accommodation Experience Parity & Module Authority

## Änderungen
- Unterkunftsmodul als vollständige Place Experience neu aufgebaut: akzentfarbige Discovery, Kategorien, Suche, Place-Karten, Detail-Workspace, Favoriten, Lifecycle, Buchungsdaten, Check-in/-out, fester Ausgangspunkt und gelöschte Unterkünfte.
- Freitextsuche wird mit Unterkunftskontext kombiniert und bleibt strikt an das aktive Reiseziel gebunden.
- Import verwendet kanonische `trip_places`-Statuswerte und beseitigt den Constraint-Fehler.
- Check-in/-out fließen in Schedule; Unterkunftsänderungen werden als Timeline-Ereignisse publiziert.
- Dashboard-Place-Aktionen können Unterkunfts-Place-Karten öffnen.
- Modulaktivierung ist authoritative: auch eine leere Modulliste wird gespeichert, geladen und in der Navigation respektiert.

## Architektur
Keine Hotel-Doppelidentität. Providerdaten bleiben in `places`, Reisebezug in `trip_places`, Unterkunfts- und Buchungsdaten in `accommodations`.

## Grenzen
Live-Angebote, Affiliate-Quellen und finaler Stay Match Score folgen in späteren Builds.
