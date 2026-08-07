# Testplan · Luvia 13.37.3 / Core 4.37.3

## Automatisch lokal geprüft
- JavaScript-Syntax der kritischen Memory/Core-Dateien.
- App-/Core-Version und Service-Worker-Cache.
- 152 lokale `index.html`-Assets vorhanden.
- CSS-Klammerstruktur konsistent.
- Voting- und Ergebnisfoto verwenden `LuviaGalleryView.openPhoto()`.
- Desktop-Spread verwendet gerundete Pixelpositionen.
- Story-Card-Kicker und kompakter Stage-Header vorhanden.
- Keine alte aktive 13.37.2/4.37.2-Version in den Runtime-Versiondateien.

## Nach Deployment manuell prüfen
1. Einen Stack mit Hero-, Story- und Signal-Cards auf einem Laptop öffnen.
   - Alle Karten sollen wieder sichtbar gleich groß/proportioniert wirken.
   - Lange Stories müssen lesbar bleiben und dürfen Footer/Actions nicht überdecken.
2. Mehrfach Stack öffnen.
   - Card-Text und Kanten sollen sichtbar schärfer sein als zuvor.
   - Hover soll die Karte sanft anheben, ohne Scale-Unschärfe.
3. Story Card öffnen.
   - Darstellung soll eindeutig als kleine Geschichte lesbar sein.
4. Voting öffnen und Foto-Thumbnail anklicken.
   - Es muss die normale Galerie-Fotoansicht mit den gewohnten Aktionen öffnen.
5. Voting-Ergebnis öffnen und Foto-Thumbnail anklicken.
   - Ebenfalls normale Galerie-Fotoansicht.
6. Stack-Header auf 1366×768/ähnlichem Laptop prüfen.
   - Titel max. zwei Zeilen, Datum separat, keine dominante Riesenheadline.
7. Mobile Swipe-Flow regressionsprüfen.
   - Swipe/Feedback/Review darf durch Desktop-Polish nicht verändert sein.
