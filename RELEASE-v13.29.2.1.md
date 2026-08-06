# Luvia 13.29.2.2 / Core 4.29.2.2

## Realtime Upload Batch Integrity

- Upload- und Media-Realtime-Ereignisse werden in einem 2,2-Sekunden-Ruhefenster gebündelt.
- Ein laufender Galerie-Load startet keinen parallelen Nachlade-Timer mehr.
- Technische Media-UPDATEs für Preview-, Thumbnail- oder Metadaten lösen keinen vollständigen Galerie-Refresh mehr aus.
- Eigene Mehrfachuploads unterdrücken Realtime bis zum abschließenden konsistenten Load.
- Cluster-Synchronisation ist serialisiert und kann nicht mehr parallel gegen dieselben Mitgliedschaften schreiben.
- Cluster-Mitgliedschaften werden konfliktfrei und mit deduplizierten Media-IDs geschrieben.
- Ein Clusterfehler blockiert nicht mehr das Aktualisieren des Fotozählers und der Galerie.
