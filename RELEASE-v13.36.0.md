# Luvia 13.36.0 / Core 4.36.0 — Memory Cards Foundation

## Neuer Memory-Kern

Luvia Memories wird nicht mehr um verpflichtende Titel, Kapiteltexte oder fertige Albumseiten herum aufgebaut.

Die neue Hierarchie ist:

- **Memory Card** – kleinste Erinnerungseinheit
- **Memory Moment** – mehrere Cards rund um dieselbe Szene
- **Memory Journey** – mehrere Moments plus freie Cards einer Reise
- **Memory Studio** – Ausgabeebene für Story, Reel, Post, Wrapped, Film und Reisebuch

## Memory Cards

Neue Tabelle `memory_cards` und neuer Core-Service `LuviaMemoryCards`.

Cards können unter anderem Fotos, kurze Aussagen, Reaktionen und Kontext enthalten. Titel und Fließtext sind nicht erforderlich. Jede Card besitzt einen Autor und kann als Erinnerung, wichtig oder Herzstück gewichtet werden.

## Gemeinsames Erinnern

Der erste neue Discovery-Flow arbeitet mit kurzen Entscheidungen statt Formularen:

1. persönliches Bild auswählen
2. eine kurze Frage beantworten – optional und maximal 240 Zeichen
3. Momentcharakter und Reaktion auswählen
4. Beiträge aller Reisenden aufdecken
5. eigene Cards gewichten

Die Perspektiven anderer Reisender bleiben getrennt sichtbar und werden nicht gegenseitig überschrieben.

## Bewusst noch nicht Teil dieses Releases

13.36.0 ist die Foundation. Memory Journey Curation und die neue Memory-Studio-Ausgabe folgen auf dieser Card-Basis in separaten Releases. Die bisherigen Galerie-, Places- und Upload-Pipelines bleiben unangetastet.

## Datenbank

Migration erforderlich:
`supabase/migrations/20260807105000_memory_cards_foundation.sql`

Kein Edge-Function-Deployment erforderlich.
