# TEST — Luvia 13.37.6

## Automatisch geprüft
- JavaScript-Syntax der kritischen Runtime-Dateien.
- `renderLooseCard()` definiert `cls` vor jeder Nutzung.
- App/Core/Cache/Force-Update stehen auf 13.37.6 / 4.37.6.
- Lokale `index.html`-Assets existieren.
- Keine aktiven 13.37.4-/4.37.4-Referenzen in den Runtime-Versiondateien.
- ZIP-Integrität.

## Nach Deployment manuell prüfen
1. Erinnerungen öffnen.
2. Einen Stack anklicken.
3. Desktop: radiale Spread-Ansicht muss sofort mit allen Karten erscheinen; keine leere Bühne.
4. Mobile: Swipe-Deck muss erscheinen.
5. Foto-, Story-, Signal-Card jeweils öffnen.
6. Voting-/Albumaktionen und Foto-Lightbox kurz gegenprüfen.
7. Stack schließen und einen zweiten Stack öffnen.
