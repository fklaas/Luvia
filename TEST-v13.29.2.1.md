# Test 13.29.2.2

1. Galerie öffnen und `LuviaGalleryDiagnostics.reset()` ausführen.
2. Mehrere Fotos am Handy hintereinander hochladen.
3. 8 Sekunden nach dem letzten Upload warten.
4. Auf PC und Handy muss dieselbe Fotoanzahl erscheinen.
5. `LuviaGalleryDiagnostics.snapshot()` ausführen.

Erwartung: Upload-Ereignisse dürfen zahlreich sein, `loadCount`, `readDataCount` und `clusterSyncCount` steigen aber nur gebündelt. Keine HTTP-409-Konflikte auf `media_clusters` oder `media_cluster_items`.
