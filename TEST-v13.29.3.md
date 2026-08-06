# Test 13.29.3

## Upload-Batch
1. `LuviaGalleryDiagnostics.reset()` ausführen.
2. Mehrere Fotos auf einem zweiten Gerät hochladen.
3. Nach dem letzten Upload mindestens 5 Sekunden warten.
4. `LuviaGalleryDiagnostics.snapshot()` ausführen.
5. Erwartung: ein gebündelter Realtime-Load, keine 409-Duplicate-Key-Fehler, gleiche Fotoanzahl auf beiden Geräten.

## Galerie leeren
1. Testreise mit Fotos, Cluster, Memory Album und Polaroid verwenden.
2. „Galerie leeren“ anklicken.
3. Ohne exakte Eingabe `GALERIE LEEREN` darf der Löschbutton nicht aktiv werden.
4. Nach Bestätigung müssen Galerie, Fotomomente, Memory Albums und Foto-Timeline-Einträge leer sein.
5. Andere Reisedaten und Places bleiben unverändert.
