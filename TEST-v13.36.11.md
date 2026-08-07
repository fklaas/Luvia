# Testplan — Luvia 13.36.11 / Core 4.36.11

## Automatisierbare lokale Checks
- JavaScript-Syntax aller geänderten kritischen Runtime-Dateien.
- Versions-/Cache-Konsistenz 13.36.11 / 4.36.11.
- lokale Assets aus `index.html` vorhanden.
- Mobile Swipe-Feedback links/rechts im Runtime-Markup und CSS vorhanden.
- Abschlusszustand nach letzter Karte mit zwei funktionalen Aktionen vorhanden.
- Desktop-Albumaktionen liegen innerhalb der Card statt außerhalb des geclippten Bereichs.
- Radiale Desktop-Komposition verwendet Stage-Mittelpunkt und responsive Ellipse.
- Rotation ist auf wenige Grad begrenzt.
- Responsive Laptop-Card-Maximalbreite vorhanden.
- ZIP-Integrität.

## Manuell nach Deployment prüfen
1. Mobile: Karte langsam nach rechts ziehen. Overlay `Für Album behalten` muss progressiv sichtbar werden.
2. Mobile: Karte langsam nach links ziehen. Overlay `Nicht ins Album` muss progressiv sichtbar werden.
3. Unterhalb der Schwelle loslassen: Karte federt zurück, keine Review-Entscheidung ändern.
4. Über Schwelle wischen: Karte fliegt weg und Entscheidung bleibt nach erneutem Öffnen markiert.
5. Alle Karten durchswipen: Abschlussansicht `Alle Karten geprüft` erscheint.
6. `Auswahl erneut prüfen`: Stapel beginnt wieder bei Karte 1.
7. `Zurück zu Erinnerungen`: Review-Overlay schließt tatsächlich.
8. Desktop: Karte hovern. Beide Album-Aktionen müssen vollständig innerhalb der Karte sichtbar sein.
9. Desktop: Links/Rechts-Aktion klicken und Stapel erneut öffnen. Auswahl muss erhalten bleiben.
10. Desktop auf Laptop und großem Monitor mehrfach öffnen: Karten müssen radial um die Bühnenmitte verteilt sein; keine extreme Randflucht oder harte Mehrfachcluster.
11. Karten dürfen leicht überlappen, aber wichtige Inhalte sollen nicht großflächig verdeckt sein.
12. Hover-Lift muss weiterhin weich funktionieren.
