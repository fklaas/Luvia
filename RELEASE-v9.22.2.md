# Luvia v9.22.2 · Core 2.12.4.2

## Restaurant Branding & Destination Context Fix

- Restaurant-Suchergebnisse vollständig an das Luvia-Kartendesign angepasst.
- Harte schwarze Fremdstile durch spezifisch gekapselte Modulstyles entfernt.
- Aktive Reisefarbe steuert Karten, Match-Score, Tags, Buttons und Detailansicht.
- Aktive Reise wird nun aus Trip Context/App State autoritativ ermittelt; veraltete Instanzdaten überschreiben sie nicht mehr.
- Destination Context wird bei jedem Modul-Render aktualisiert und aus kanonischer Stadt, aktivem Backend-Kontext, normalisiertem Trip und Legacy-Feldern robust aufgebaut.
- Suchrequests erhalten den aufgelösten Destination Context statt eines leeren/stalen Modulwertes.
- Responsive Darstellung der Trefferaktionen verbessert.

Keine SQL-Migration und kein Edge-Function-Deployment erforderlich.
