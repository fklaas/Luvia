# Luvia 13.29.3 / Core 4.29.3

## Quiet Upload Window & Complete Gallery Clear

- Media-Realtime wartet nach dem letzten Upload-Ereignis auf eine echte Ruhephase von 3,5 Sekunden.
- Während eines laufenden Galerie-Ladevorgangs werden weitere Ereignisse gesammelt und nicht sofort nachgeladen.
- Technische UPDATE-Ereignisse für Preview-, Thumbnail- und Delivery-Metadaten werden anhand des bereits geladenen Medienzustands ignoriert.
- Cluster-Synchronisierung verwendet idempotente Upserts für `media_clusters` und `media_cluster_items`.
- Gleichzeitige Geräte dürfen denselben Cluster oder dieselbe Medienzuordnung aktualisieren, ohne Duplicate-Key-Inserts zu erzeugen.
- Neuer Button „Galerie leeren“ mit Texteingabe-Bestätigung.
- Die Löschaktion entfernt Fotos, Storage-Dateien, Fotomomente, Cluster-Zuordnungen, Memory Albums, Polaroids und Fotoeinträge der Timeline für die aktive Reise.
