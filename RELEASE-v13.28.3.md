# Luvia 13.28.3 / Core 4.28.3 — Realtime Gallery Experience

## Ziel
Die Smart-Photo-Grundlage wird zu einer vollständig bedienbaren, gemeinsamen Galerie ausgebaut.

## Enthalten
- Realtime-Nachladen für Media, Cluster, Cluster-Items und Tages-Polaroids ohne Seitenreload.
- stabiler Cluster-Schlüssel auf Grundlage der tatsächlichen Media-IDs; alte verworfene Tagescluster blockieren neue Fotos nicht mehr.
- automatische Gruppierung ab zwei Fotos innerhalb von 20 Minuten, sofern Reisetag und vorhandene GPS-Daten kompatibel sind.
- geschlossene Akkordeons für jeden Reisetag sowie „Sonstige Reisebilder“.
- Favoritenleiste und gemeinsame persistente Favoriten.
- vergrößerte Fotoansicht.
- bearbeitbarer Titel mit Aufnahmezeit-Vorschlag.
- nicht-destruktiver Fotoeditor für Helligkeit, Kontrast, Sättigung, Filter und Rotation.
- ein gemeinsames „Polaroid des Tages“ pro Reisetag.

## Datenmodell
`media` erhält `favorite`, `display_name` und `edit_settings`. `media_day_polaroids` hält die eindeutige Tagesauswahl. Originaldateien werden durch den Editor nicht verändert.
