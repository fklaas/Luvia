# Luvia 13.37.0 · Core 4.37.0
## Memory Curation Foundation

Basis: 13.36.11 / Core 4.36.11.

## Curation-Modell
- Memory Cards werden für die weitere Album-Kuration als `hero`, `story` oder `signal` klassifiziert.
- Hero: bewusst ausgewählte Fotos.
- Story: persönliche Sätze/Gedanken und andere erzählerische Inhalte.
- Signal: Stimmung/Reaktion als unterstützender Kontext, nicht als alleinige Albumlogik.
- Alte reine Reaktionskarten werden in der Memory-Oberfläche nicht zusätzlich gezeigt, wenn für denselben Autor/Moment bereits eine Momentgefühl-Karte existiert.
- Neue Momentgefühl-Karten verbinden Stimmung und Reaktion in einer gemeinsamen Signal-Karte.

## Mehrere Foto-Perspektiven
- Pro Reisendem und Foto-Moment können bis zu drei Fotos für den Kartenstapel ausgewählt werden.
- Auswahl wird als eigene Hero Cards in `memory_cards` gespeichert.
- Bestehende gewählte Fotos werden wiederverwendet statt dupliziert; abgewählte eigene Foto-Cards werden nur aus der aktiven Stack-Auswahl genommen.

## Day/Cluster Source of Truth
- Stack-Datum wird aus den `dayKey/day_key`-Werten der bereits von Media/Gallery zugeordneten Fotos berechnet.
- Es gibt keine zweite unabhängige Datumslogik für Memory Stacks.
- Automatischer Stacktitel kombiniert den echten Reisetag optional mit dem vorhandenen Cluster-Titel.

## Gemeinsame Curation
- Review-Entscheidungen aller Trip-Mitglieder dürfen für den gemeinsamen Review-Status gelesen werden; Schreiben bleibt weiterhin nur für die eigene Entscheidung erlaubt.
- Stapel zeigen an, wie viele Cards bereits von allen Reisenden geprüft wurden und wann ein Stapel für die spätere Priorisierung bereit ist.
- Jeder Reisende kann einen eigenen Stack-Titelvorschlag speichern.
- Titelwahl/Rangfolge selbst folgt im nächsten Collaborative-Ranking-Schritt.

## Owner-only Stack-Auflösung
- Nur der Reisebesitzer darf einen Kartenstapel auflösen.
- Auflösen löscht keine Fotos und keine Memory Cards.
- Der Stack wird über `memory_stack_curation.status = dissolved` aus der Curation-Oberfläche ausgeblendet.
- Backend-RPC prüft die tatsächliche Reise-Ownership.

## Galerie
- Die parallele sichtbare `Memory Moments`-Sektion wurde aus der Fotogalerie entfernt.
- Media-Cluster bleiben intern die Quelle für Memory/Curation, werden aber nicht mehr als zweites konkurrierendes Memory-System in der Galerie angezeigt.

## Desktop-Schärfe
- Spread-Cards werden nicht mehr beim Hover hochskaliert.
- Der Lift erfolgt über Translation/Shadow; die reale CSS-Kartengröße bleibt bestehen, um Text und Kanten auf Laptop/Desktop schärfer zu halten.

## Backend
Neue Migration erforderlich:
`supabase/migrations/20260807190000_core_v4_37_0_memory_curation_foundation.sql`
