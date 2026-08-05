# Luvia 13.29.1 / Core 4.29.1 — Memory Albums Performance & Experience Correction

- Memory-Album-Ansicht lädt nur Albumdaten und benötigte Cover-Medien statt der gesamten Galerie.
- Neue `MediaCore.listByIds()`-API für gezielte Medienabfragen.
- Wizard-Bedienelemente werden vor jeder Bild-Hydrierung aktiviert.
- Progressive Bild-Hydrierung in kleinen Batches; Fotoauswahl und Albumdetails werden seitenweise erweitert.
- AI-Titel laufen im Hintergrund, lokale Vorschläge sind sofort verfügbar.
- Realtime hört nur noch auf abgeschlossene Albumänderungen und bündelt Refreshes.
- Neue Schritte: Teilnehmer, Ort, Zeitraum, persönliches Lieblingsfoto je Nutzer und Überraschungsmodus.
- Performance-Diagnostik über `luvia:memory-performance` und `[LuviaMemoryPerf]`.
