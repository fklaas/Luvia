# Luvia 13.28.5.3 / Core 4.28.5.3

## Photo Studio Workspace & EXIF Reliability

- Photo Studio vollständig als dunkler, werkzeugorientierter Arbeitsbereich neu aufgebaut.
- Mobile Editor nutzt den verfügbaren Bildschirm, zeigt das vollständige Foto mit `object-fit: contain` und scrollt innerhalb des Arbeitsbereichs statt das Popup beziehungsweise die Seite zu verschieben.
- Werkzeuge öffnen als eigene Drawer: Looks, Anpassen, Kreativ sowie Titel & KI.
- Eigener Fototitel und KI-Titel sind nur im Titel-Werkzeug sichtbar.
- Filter- und Sticker-Auswahl auf kleinen Displays horizontal scrollbar.
- Sticker und Texte werden nicht-destruktiv in normalisierten Bildkoordinaten gespeichert.
- Galerie, Favoriten, Cluster, Lightbox und Editor verwenden dieselbe bildbezogene Overlay-Geometrie.
- JPEG-EXIF-Parser robuster umgesetzt: vollständiges JPEG, korrekte APP1-/TIFF-/IFD-Zeiger, DateTimeOriginal, OffsetTimeOriginal sowie GPS-Rationalwerte.
- Ausgelesene EXIF-Fakten werden im Media-Metadatenobjekt dauerhaft mitgespeichert.
- KI-Titel erhält Aufnahmezeit, EXIF-Koordinaten, Reiseziel und bekannten Place-Kontext.
- AI Memory Bridge erzeugt bei erkanntem nahen Place einen konkreteren Momenttitel.
