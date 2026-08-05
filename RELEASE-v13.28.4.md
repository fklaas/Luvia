# Luvia 13.28.4 – Gallery Studio & Silent Realtime

## Ziel
Korrektur der sichtbaren Realtime-Schleife und Ausbau der Galerie zu einer echten, tagebasierten Fotoerfahrung.

## Enthalten
- Reisetage als Kacheln mit eigener Fotoansicht und sanftem Übergang
- unsichtbares, ereignisgesteuertes Realtime statt periodischem Neurendern
- Re-Clustering nur bei relevanten Media-Änderungen
- defensives Upsert für `media_cluster_items`
- App-Kamera mit Aufnahmezeit, Geräte-Metadaten und optionalem Gerätestandort
- große Fotomoment-Detailansicht in der Timeline
- Luvia Photo Studio mit 20 Filtern, Rahmen, Stickern, Text, Wärme, Vignette und Blur
- nicht-destruktive, gemeinsame Bearbeitung über `media.edit_settings`

## Versionsstand
- App 13.28.4
- Core 4.28.4
- Timeline Core 5.3.9
