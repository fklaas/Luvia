# Luvia 13.29.6 / Core 4.29.6

## Gallery Media Pipeline Reset

- Eine einzige native `<img>`-Pipeline für Galerie, Fototage, Favoriten und Fotomomente.
- Die nachträgliche `hydrateImages()`-Hydrierung und CSS-Hintergrundbild-Pipeline wurden entfernt.
- Cluster erhalten ihre Vorschaubilder direkt beim ersten Rendern.
- Leere Bildtitel werden in normalen Galerieansichten nicht mehr als „Titel hinzufügen“ angezeigt.
- Das Foto-Popup lädt zuerst das Thumbnail und danach das echte Original vom `storage_path`.
- Der Übergang zum Original nutzt 3 px Blur und einen 650-ms-Crossfade nach erfolgreichem Decode.
- Realtime verwendet nur noch eine gebündelte Refresh-Warteschlange.
- Travel-Context-Uhr- und Visibility-Ereignisse pausieren im Gallery-Fokusmodus.
