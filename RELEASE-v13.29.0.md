# Luvia 13.29.0 / Core 4.29.0 – Isolated Memory Albums Foundation

Memory Albums wurden als vollständig getrenntes Modul auf Basis des stabilen 13.28.7-Frontends integriert.

## Schutz der stabilen Galerie
- `app/gallery-view.js` unverändert
- `app/gallery-view.css` unverändert
- `core/media/media-core.js` unverändert
- Galerie-Realtime, Foto-Popup und Cluster-Rendering unverändert
- Places/Foursquare unverändert

## Memory Albums
- eigener Service `core/media/memory-albums.js`
- eigene Route unter Erinnerungen → Memory Albums
- geführte Reise aus einem vorhandenen Fotomoment
- Stimmung, Titel, Cover, Fotoauswahl
- persönliches Lieblingsfoto je Teilnehmer
- Personen, Ort und Zeitraum
- Überraschungsmodus
- persistente Memory-Alben und eigene Realtime-Subscription
