# Luvia 13.29.4 / Core 4.29.4 — Media Delivery Rebuild

- echte Upload-Varianten: `thumb-256.webp`, `thumb-640.webp`, `preview-1280.webp`
- neue Media-Spalten für stabile Delivery-Pfade
- ein kompakter RPC `luvia_gallery_bootstrap(trip_id)` für Galerie, Cluster, Alben und Polaroids
- gebündelte Signierung von Thumbnail-Pfaden statt Einzelrequests
- direkte Browser-/CDN-Auslieferung ohne Fetch→Blob→Object-URL-Pipeline
- Supabase Image Transform als Übergang für vorhandene Medien
- leiser Hintergrund-Backfill für bestehende Bilder, maximal zwei Medien pro Leerlaufphase
- Galerie fällt bei Clusterfehlern auf die übrigen Daten zurück
- keine blockierende Preview-Prewarm-Schleife mehr
