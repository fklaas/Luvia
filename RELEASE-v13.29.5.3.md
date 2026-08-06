# Luvia 13.29.5.3 – Cluster, Day Media & Realtime Integrity

- Fotomomente werden beim Galerie-Mount und bei relevanten Media-Realtime-Ereignissen erneut erzeugt und persistiert.
- Statusanzeige aktualisiert Foto- und Fotomomentanzahl bei jedem Realtime-Refresh.
- Tagesansichten malen direkte Thumbnails zusätzlich als CSS-Hintergrund und bleiben damit sichtbar, auch wenn Browser Bild-Load-Events verzögert.
- Lightbox öffnet sofort mit Thumbnail und wechselt danach progressiv auf Original-/Rendered-Qualität.
- Originalauflösung bevorzugt storage_path statt kleiner Preview-Dateien.
