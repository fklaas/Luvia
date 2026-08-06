# Luvia 13.29.2.2 / Core 4.29.2.2

## Realtime Counter Consistency

- Der Galerie-Status wird nach jedem erfolgreichen Datenabruf und Renderdurchlauf aktualisiert, auch bei stillen Realtime-Refreshs.
- Foto- und Fotomoment-Zähler bleiben zwischen Geräten ohne Modul-Neuladen synchron.
- Keine Änderung an Storage, Bildpipeline, Clusterlogik oder Places/Foursquare.
