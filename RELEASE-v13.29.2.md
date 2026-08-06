# Luvia 13.29.2 / Core 4.29.2

## Gallery Request Storm Fix

- Unterbricht die selbst ausgelöste Cluster-Realtime-Schleife.
- Cluster-Synchronisation schreibt nur noch bei tatsächlichen Änderungen.
- Unveränderte Cluster-Mitgliedschaften werden nicht mehr gelöscht und neu angelegt.
- Realtime-Ereignisse aus der eigenen Cluster-Synchronisation werden während einer kurzen Schutzphase ignoriert.
- Mehrere Refresh-Anforderungen werden zusammengeführt; `analyze: true` geht dabei nicht verloren.
- Doppeltes Mounten derselben Galerie wird abgefangen.
- Der Timeline-Text auf Fotokarten wurde durch ein reines Polaroid-Symbol ersetzt.

Keine SQL-Migration und kein Edge-Function-Deployment erforderlich.
