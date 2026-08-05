# Luvia 13.28.6.3 / Core 4.28.6.3

## Photo Surface & Album Intelligence Recovery

- Repariert den fehlenden `persist`-Dienst der AI Memory Bridge, durch den `LuviaAIMemoryBridge` beim Laden nicht registriert wurde.
- Albumtitel-Vorschläge können wieder über `analyze()` erzeugt und gespeichert werden.
- Die Einzelbildansicht verwendet nun denselben kanonischen Foto-Renderer wie Galerie und Editor; keine weiße Präsentationsfläche liegt mehr über dem Bild.
- Album-Collagen und Album-Detailminiaturen rendern Filter, Drehung, Rahmen, Sticker und Bildtexte aus denselben `edit_settings` wie alle anderen Ebenen.
- Gespeicherte Bearbeitungen werden nach dem Save über den autoritativen Media-Core neu geladen und in allen Ansichten dargestellt.
