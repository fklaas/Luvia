# Luvia 13.29.5.1 – Legacy Media Recovery & Delivery Diagnostics

- Korrigiert die Edge Function `luvia-media-delivery`: schema-tolerante Medienabfrage, strukturierte Fehler, Log-Ausgaben und isolierte Fehler pro Foto.
- Bereits vorhandene Thumbnails werden validiert und übersprungen.
- Alte Fotos ohne Thumbnail-Pfade bleiben über eine einzige gebündelte Preview-Signierung sichtbar, bis der Backfill abgeschlossen ist.
- Galerie entfernt Platzhalterzustände zuverlässig, sobald ein Bild geladen ist.
- Version: App 13.29.5.1 / Core 4.29.5.1.
