# Luvia 13.27.5.1 – Diagnostics Correction

## Zweck
Korrektur des Readiness-Builds 13.27.5. Die Developer Console und die Diagnosetestseite laden nun dieselben für die Smoke-Tests erforderlichen Core-, AI-, Lifecycle- und Media-Diagnoseabhängigkeiten in definierter Reihenfolge.

## Korrekturen
- `media-readiness.js` wird vor `base-services.js` geladen.
- `media-readiness.test()` liefert bei fehlender Implementierung eine kontrollierte Diagnoseantwort statt eines TypeErrors.
- Kernel-Version wird vor `core-v4-finalization.js` geladen.
- Vollständige Luvia-Brain-Abhängigkeiten werden in Developer Console und Diagnoseseite geladen.
- Place-Lifecycle-Service wird in beiden Diagnoseoberflächen geladen.
- alle aktiven `13.17.0`-Referenzen in `intelligence/test.html` wurden entfernt.
- Core-4-Fallbacks sind auf Core 4.27.5.1 / Build 13.27.5.1 gesetzt.
- Smoke-Test-Bezeichnung `Move Adapter` wurde fachlich zu `Mobility Adapter` korrigiert.

## Keine fachlichen Änderungen
Kein Foto-Upload, keine Datenbankmigration, keine Storage-Policy und keine Edge Function wurde verändert.
