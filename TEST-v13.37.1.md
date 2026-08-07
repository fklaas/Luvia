# Testplan — Luvia 13.37.1 / Core 4.37.1

## Automatisiert/lokal geprüft
- JavaScript-Syntax der kritischen Runtime-Dateien.
- Version und Cache auf 13.37.1 / 4.37.1.
- 152 lokale `index.html`-Assets vorhanden.
- CSS-Klammerstruktur konsistent.
- Titel-Modal vorhanden; alter Browser-Prompt entfernt.
- „bereit zur Priorisierung“ aus aktiver UI entfernt.
- Voting-UI und Core-API vorhanden.
- neue Vote-Migration vorhanden.
- Reaktionskarten werden nicht mehr pauschal aus der Stapelmenge entfernt.

## Nach Deployment manuell prüfen
1. Stapelkarten: Datum klein, Titel max. 2 Zeilen, keine abgeschnittenen Statuszeilen.
2. „Titel vorschlagen“ öffnet ein Luvia-Modal, kein Browser-Prompt.
3. Titel speichern, Seite neu laden, Vorschlag muss weiter vorhanden sein.
4. Einen vollständig gemeinsam geprüften Stapel öffnen: „Lieblingsmomente wählen“ muss erscheinen.
5. Punkte 0–3 verteilen; Budget darf nicht überschritten werden.
6. Punkte speichern, Seite neu laden und Voting erneut öffnen: Werte müssen aus Supabase wieder erscheinen.
7. Mit zwei Reisenden prüfen, dass jeder ein eigenes Punktebudget und eigene Punkte besitzt.
8. Neue Memory-Discovery durchführen: bis zu 3 Fotos + Story + Momentgefühl + Reaktion können wieder einen ausreichend gefüllten Stapel ergeben.
9. Signal-/Reaction Card prüfen: Emoji muss mit Kontext statt als völlig isolierte Karte erscheinen.
