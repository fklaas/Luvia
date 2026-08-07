# TEST — Luvia 13.37.4 / Core 4.37.4

## Automatisch ausgeführt
- JavaScript-Syntax: kritische Memory-/Version-/Diagnostikdateien
- Versions-/Cache-Konsistenz 13.37.4 / 4.37.4
- 152 lokale index.html-Assets vorhanden
- CSS-Klammerstruktur konsistent
- Kein Runtime-Wartepfad des alten 2,35-s Launchscreens
- Summary-Chips und Summary-Status außerhalb der Frontkarte vorhanden
- Desktop Spread weiterhin vorhanden
- Mobile Throw/Swipe weiterhin vorhanden
- Voting und bestehende Gallery-Fotoansicht weiterhin verdrahtet
- ZIP-Integrität

## Nach Deployment manuell prüfen
1. Einen geschlossenen Stack auf Desktop anklicken: radiale Kartenansicht muss direkt erscheinen.
2. Denselben Stack mehrfach öffnen/schließen: kein Kartenrücken-Sackgassen-Screen.
3. Mobile: Stack öffnet weiterhin das Swipe-Deck.
4. Unter jedem geschlossenen Stack müssen Inhaltschips und Workflow-Status vollständig lesbar sein.
5. Voting-/Ergebnis-/Titelbuttons dürfen weiterhin funktionieren.
6. Voting-Foto anklicken: normale Luvia-Fotoansicht muss öffnen.
7. Laptop/PC: Schärfe-Fixes aus 13.37.3 dürfen nicht regressieren.
