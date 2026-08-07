# Luvia 13.37.5 · Core 4.37.5 — Memory Spread Runtime Recovery

## Anlass
13.37.4 konnte beim Öffnen eines Memory-Stapels eine leere Bühne anzeigen. Ursache war ein Runtime-Fehler in `renderLooseCard()`: die Variable `cls` wurde für Story-/Curation-Klassen verwendet, aber nach dem 13.37.3-Polish nicht mehr initialisiert.

## Korrektur
- `renderLooseCard()` initialisiert die Curation-Klasse wieder explizit über `curationClass(card)`.
- Der direkte Navigationspfad aus 13.37.4 bleibt bestehen: Stack → Spread/Swipe ohne Launch-Sackgasse.
- Summary-Recovery, Voting, Media-Lightbox, Mobile Swipe und alle 13.37.3-Schärfeanpassungen bleiben erhalten.
- Keine Datenbank- oder Edge-Function-Änderung.
