# Luvia 11.2.3 · Core 3.0.2.3

## Unified Core Diagnostics

- Trips-Diagnose liest jetzt denselben kanonischen `LuviaTripStore` wie App und Destination-Anzeige.
- Diagnose-Seiten laden Storage, Legacy-Migrator und Trip Store explizit und initialisieren den Store bei Bedarf.
- Reiseziel wird aus dem strukturierten Destination-Objekt geprüft.
- Ein fehlender optionaler Reisezeitraum macht den Trips-Service nicht mehr technisch fehlerhaft.
- PWA-Diagnose lädt die PWA-API robust aus `/intelligence/pwa-service.js` und fällt nicht mehr auf einen veralteten globalen Ladezustand zurück.
- Core-Diagnose und Developer Console verwenden denselben Service- und Versionsstand.
