# Luvia 13.37.2 · Core 4.37.2 — Memory Voting Results & Card Content Fit

## Ziel
Dieser Build schließt die Lücke zwischen funktionierendem Memory Voting und einer für Reisende verständlichen Curation-Erfahrung.

## Änderungen
- Voting-Lifecycle direkt auf jedem Kartenstapel: ansehen → Lieblingsmomente wählen → auf Mitreisende warten → Ergebnis ansehen.
- Neue Ergebnisansicht mit Rangfolge, Gesamtpunkten und sichtbaren Einzelstimmen.
- Voting zeigt den tatsächlichen Karteninhalt: Foto-Thumbnail, Story-Text oder Signal-Kontext statt nur Kartentyp.
- Punktebudget ist eindeutig formuliert: verbleibende Punkte / Gesamtbudget bzw. alle Punkte vergeben.
- Nicht angefasste Kandidaten werden beim Speichern explizit mit 0 Punkten persistiert; dadurch ist der Abschlussstatus zuverlässig erkennbar.
- Datum und Stacktitel sind in der geöffneten Ansicht getrennt.
- Content-driven Card Fit: keine starre 5:7-Höhe für Story-, Signal- und Hero-Cards; Fuß-/Action-Bereiche bleiben sichtbar.
- Schwache Story-/Gedanken-Karten sind keine automatischen Album-Kandidaten mehr.
- Eigene schwache Story Cards können über „Erinnerung ergänzen“ zu einer echten Mini-Geschichte erweitert werden.
- Neue Story-Erfassung fordert 1–3 Sätze Kontext statt „ein Satz reicht“.
- Technische HERO/STORY/SIGNAL-Kennzeichnungen werden auf den sichtbaren Karten nicht mehr zusätzlich eingeblendet.
- Vote-Realtime aktualisiert den Stapelstatus, wenn ein anderer Reisender seine Punkte speichert.

## Datenmodell
Keine neue Tabelle erforderlich. 13.37.2 baut auf `memory_card_album_votes` aus 13.37.1 auf.
