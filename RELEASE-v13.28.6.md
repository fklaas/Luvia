# Luvia 13.28.6 / Core 4.28.6

## Photo Metadata & Studio Reconstruction

- HEIC/HEIF EXIF parsing through exifr before conversion.
- JPEG fallback parser retained.
- Original capture time, timezone offset, GPS, camera, orientation and dimensions persisted.
- EXIF coordinates resolved through the secure Places Gateway to a nearby named place.
- Existing originals can be reanalysed from the Photo Studio.
- Photo Studio rebuilt as a light, open, tool-driven workspace.
- Sticker/text overlays use image-relative v2 coordinates and one projection model in editor, cards and lightbox.
- All photo views use contain geometry; overlays track the actual visible image rectangle.
