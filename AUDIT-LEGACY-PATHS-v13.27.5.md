# Legacy- und Parallelpfade 13.27.5

| Pfad | Befund | Risiko | Entscheidung | Ziel-Build |
| --- | --- | --- | --- | --- |
| project/ (vollständige Spiegelkopie) | 1382/1382 Dateien identisch zum Root | Packaging-Doppelstruktur, nicht Laufzeit | archivieren/später entfernen | 13.28.x Packaging-Cleanup |
| gallery.js + modules/gallery.js + sync/gallery.js | aktiv/legacy gemischt | IndexedDB + Cloud gallery_photos + paris-gallery | migrieren | 13.28.0 |
| live-moments.js + modules/liveMoments.js + sync/live-moments.js | aktiv/legacy gemischt | Statusmodell plus linked_photo_id | migrieren | 13.28.0/13.28.2 |
| smart-photo-moments.js | Legacy/experimentell | lokaler IndexedDB/localStorage-Pfad | deaktiviert lassen, Datenimport prüfen | 13.28.0 |
| planning-candidate-research.js / planning-foundation.js | geladen, Produktfokus verworfen | unnötige Boot-Last und Diagnoseverwirrung | später deaktivieren | 13.28.x |
| intelligence/console.html ?v=13.20.0 | aktive Console, veraltete Cachemarker | Versionsdrift | korrigiert in 13.27.5 | 13.27.5 |
| supabase-sync.js neben sync/* | Parallel-/Altpfad | doppelte Galerie-/Realtime-Implementierung möglich | Aufrufer vor Entfernung prüfen | 13.28.0 |

Nichts wurde in 13.27.5 fachlich gelöscht. Die Einstufungen dienen als verbindlicher Migrationsplan.

## Referenz-Audit

Die aktiven Einstiegspunkte besitzen keine fehlenden lokalen Referenzen. In `legacy/ui/index-v11.0.0.html` und mehreren alten Content-Fragmenten bestehen dagegen 103 relative Verweise, die aus ihrer archivierten Unterordnerposition nicht mehr auflösbar sind. Da diese Pfade nicht zum aktuellen App-Boot gehören, wurden sie nicht künstlich korrigiert; vor einer späteren Reaktivierung oder Entfernung ist ihre Historiennutzung zu prüfen.

## Falsch benannte Binärdateien

Die Root-Dateien `config.js` und `ui.js` sind keine JavaScript-Dateien, sondern MP3/ID3-Audiodateien mit irreführender Endung. Sie wurden deshalb nicht als JavaScript syntaktisch geprüft. Da ihre Laufzeitreferenzen und historische Herkunft vor Entfernung live beziehungsweise über Git-Historie zu klären sind, bleiben sie in 13.27.5 unverändert und werden als hohes Packaging-/Security-Risiko für einen späteren Cleanup markiert.
