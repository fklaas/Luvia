# Luvia 13.33.0 / Core 4.33.0 — Memory Sceneflow Rebuild

## Ziel
Memory Moments und Memory Journeys werden nicht mehr als Kapitel-Wizard, sondern als szenischer One-Frame-Erlebnisfluss inszeniert.

## Neu
- One-frame SceneFlow ohne horizontale Seiten-Slider und ohne sichtbare Scrollbars.
- Organische Szenen: Wolken, Reisetisch, Flugfenster/Weltflug, Postkarten-Stadt, Restauranttisch, Strand/Ozean, Final Cut und Premiere/Wrapped.
- Memory Moment und Memory Journey besitzen deutlich unterschiedliche Dramaturgien.
- Bildgewichtung als Nebenrolle / Wichtig / Herzstück statt Stern-Rating.
- Cover erhält einen klaren visuellen Auswahlzustand.
- Gemeinsame Reisendenstimmen bleiben im Erlebnis sichtbar und werden separat gespeichert.
- Editor visuell in die jeweilige Szene integriert; mobile responsiv, Emoji-Palette, Basisformatierung.
- KI-Titel über vorhandene `media.cluster-title` Capability; visuelle Fotoevidenz über `media.describe`; KI-Text und Umschreiben über `brain.ask`.
- Tages-Titel und Tages-Texte besitzen getrennte KI-Aktionen.
- Story/Post-PNG und vertikaler WebM-Filmexport bleiben echte Funktionen und verwenden priorisierte Bilder.
- Galerie-Rendering, Upload-Batching und Cluster-Realtime wurden nicht verändert.

## Deployment
Keine neue SQL-Migration. Kein neues Edge-Function-Deployment erforderlich, sofern `luvia-intelligence` mit den bereits vorhandenen Capabilities `media.describe`, `media.cluster-title` und `brain.ask` deployed ist.
