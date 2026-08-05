# Luvia 13.29.0 / Core 4.29.0 — Memory Albums

## Neu
- Geführte Reise vom automatisch erkannten Smart-Photo-Cluster zum dauerhaft gespeicherten Memory Album.
- Kapitel: Entdecken, Benennen, Gestalten, Bewahren.
- Emotionale Stimmungsauswahl, bis zu zehn KI-/Fallback-Titel, Coverwahl, Fotoauswahl und optionaler Erinnerungstext.
- Abschlussanimation „Diese Erinnerung bleibt“.
- Persistente Memory Albums mit eigener Reihenfolge, Cover, Stimmung, Beschreibung und Cluster-Herkunft.
- Memory Albums ersetzen die bisherige Cluster-Ansicht im Bereich Erinnerungen > Alben.
- Smart-Photo-Cluster erscheinen direkt in Erinnerungen > Fotogalerie.
- Bereits umgewandelte Cluster zeigen ihren Memory-Status und führen direkt zum Album.

## Performance
- Albumkarten und Fotoauswahl nutzen `content-visibility` und feste intrinsische Größen.
- Albumübersicht lädt nur sichtbare Cover-Bilder vor.
- Wizard und Albumdialog begrenzen die sofortige Bildhydration.
- Kanonische, bereits gerenderte Medienfassungen werden wiederverwendet; keine zweite Bild-Pipeline.
- Keine Vollbild-Neuberechnung während der Auswahl; Zustände werden lokal aktualisiert und erst beim Abschluss persistiert.

## Datenbank
Migration ausführen:
`supabase/migrations/20260805190000_memory_albums.sql`

Neue Tabellen:
- `memory_albums`
- `memory_album_items`
