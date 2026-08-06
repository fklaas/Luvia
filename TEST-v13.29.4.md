# Test 13.29.4

## Standardbetrieb
- Galerie öffnen: keine fortlaufende Diagnoseausgabe in der Konsole.
- Mehrere Fotos hochladen und 8–10 Sekunden warten.
- Fotoanzahl auf PC und Handy vergleichen.
- Keine 409-/Duplicate-Key-Fehler in Browser oder Supabase.

## Diagnose bei Bedarf
```javascript
LuviaGalleryDiagnostics.enable()
LuviaGalleryDiagnostics.reset()
```
Nach dem Test:
```javascript
LuviaGalleryDiagnostics.snapshot()
LuviaGalleryDiagnostics.disable()
```

Erwartung: ein Mount, wenige Loads und höchstens eine Cluster-Synchronisierung pro unverändertem Medienstand.
