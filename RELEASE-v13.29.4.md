# Luvia 13.29.4 / Core 4.29.4 — Gallery Realtime Finalization

## Ziel
Die stabilisierte Galerie wird technisch abgeschlossen, ohne Bildpipeline, Galerieaufbau, Memory Albums oder Places erneut umzubauen.

## Änderungen
- Cluster-Synchronisierung läuft nur, wenn sich die clusterrelevanten Mediendaten tatsächlich geändert haben.
- Cluster-Realtime-Ereignisse innerhalb eines laufenden Media-Upload-Fensters werden als bereits abgedeckt ignoriert.
- Mehrere INSERT-/UPDATE-Ereignisse bleiben über das bestehende Ruhefenster gebündelt.
- Die Diagnose zählt weiterhin intern, schreibt aber standardmäßig keine Einzelereignisse mehr in die Konsole.
- Diagnose kann manuell aktiviert und deaktiviert werden.
- Galerie leeren aus 13.29.3.1 bleibt erhalten.
- Keine Änderung an Foursquare, Places, Memory Albums oder der Bildauslieferung.
