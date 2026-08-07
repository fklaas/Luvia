# Luvia 13.37.1 · Core 4.37.1 — Memory Curation UX Polish & Voting Entry

## Ziel
Die Curation Foundation aus 13.37.0 wird verständlicher, emotionaler und erstmals um eine echte gemeinsame Lieblingsmomente-Bewertung erweitert.

## Änderungen
- Stapelkarten neu strukturiert: Datum getrennt vom Titel, kleinere zweizeilige Titel, kompakte Inhalts-Chips und menschlicher Review-Status.
- Browser-`prompt()` für Titelvorschläge entfernt und durch ein Luvia-eigenes Modal ersetzt.
- Technische Begriffe wie „Priorisierung“ aus der sichtbaren Memory-UI entfernt.
- Kartenmenge neu balanciert: vorhandene Reaktionskarten werden nicht mehr pauschal ausgefiltert; neue Reaktionen werden als unterstützende Signal Card gespeichert und mit dem zugehörigen Momentgefühl kontextualisiert.
- Story-/Signal-Darstellung aufgewertet, damit Reaktionen nicht nur als isoliertes Emoji erscheinen.
- Erste funktionale Voting-Stufe: Sobald alle Karten gemeinsam angesehen wurden, können Album-Kandidaten mit einem dynamischen persönlichen Punktebudget bewertet werden (0–3 Punkte je Karte).
- Punkte werden dauerhaft in Supabase gespeichert.

## Architektur
- UI verwendet weiterhin ausschließlich die öffentliche `LuviaMemoryCards`-API.
- Neue Cloud-Tabelle `memory_card_album_votes` für persönliche Punkte.
- Bestehende Review-Entscheidungen (`included`/`excluded`) bestimmen die Kandidaten für die Punktevergabe.
