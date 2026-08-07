# Luvia 13.37.3 · Core 4.37.3
## Memory Card Visual Consistency & Voting Media Polish

Dieser Build verfeinert die bestehende Memory-Curation-Oberfläche ohne neue Datenbankarchitektur.

### Änderungen
- Desktop-Memory-Cards wieder mit einheitlicher Grundproportion statt stark variierender Höhen.
- Lange Story-Texte werden innerhalb derselben Kartenproportion typografisch kleiner skaliert.
- Story Cards erhalten eine klarere, ruhigere Darstellung als „Kleine Geschichte“.
- Desktop-Positionierung verwendet gerundete Pixelkoordinaten statt permanenter `translate(-50%,-50%)`-Zentrierung.
- Hover-Lift bleibt erhalten, verzichtet aber auf zusätzliche Scale-Vergrößerung.
- Geöffneter Stack-Header trennt Datum, Titel und Meta klarer und verwendet eine deutlich kleinere Titeltypografie.
- Auch die Stack-Titel in der Übersicht wurden auf Laptop/Desktop kompakter gemacht.
- Foto-Thumbnails im Punkte-Voting öffnen per Klick die bestehende Luvia-Gallery-Lightbox (`LuviaGalleryView.openPhoto`).
- Foto-Thumbnails in der Ergebnisansicht verwenden dieselbe bestehende Bildansicht.

### Nicht verändert
- Keine neue Supabase-Tabelle.
- Keine neue Migration.
- Keine neue Edge Function.
- Bestehende Album-Review-, Punkte- und Ergebnislogik bleibt unverändert.
