# Testplan v9.22.4

## Match Score
1. Restaurant suchen und Match-Wert in der Liste notieren.
2. Details desselben Restaurants öffnen.
3. Wert muss exakt identisch sein.
4. In der Browserkonsole `LuviaRestaurantMatchScoreTest.run()` ausführen; Ergebnis muss `{ ok: true }` liefern.

## Mobile Suche
- Bei 760 px, 430 px und 375 px Breite prüfen.
- Suchfeld und Suchen-Button müssen sichtbar sein.
- Eingabe, Filter und Absenden müssen funktionieren.

## Design
- Keine Unterstreichungsbalken an Buttons.
- Fokuszustände per Tastatur sichtbar.
- Hover und Active ohne Layoutsprung.
- Detailansicht ohne harte schwarze Aktionsfläche.
- Helle und dunkle Reisefarben testen.

## Regression
- Restaurantsuche, Details, Speichern, Favorit, Tagesplan und Besucht testen.
- Reise wechseln und Akzentfarbe kontrollieren.
- Destination wechseln und neue Suche ausführen.
- Desktop, Tablet und Mobile testen.
