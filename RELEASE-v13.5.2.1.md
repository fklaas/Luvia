# Luvia 13.5.2.1 — Favorite Card & Instant Media Closure

- Restaurant- und Unterkunftsfavoriten verwenden dieselben globalen Karten wie Suchvorschläge.
- Favoriten laden Google-Detail- und Fotodaten über den gemeinsamen Detailcache nach.
- Restaurantfavoriten öffnen ausschließlich die globale Place-Detailkarte; der alte Workspace wird nicht mehr über Favoritenkarten geöffnet.
- Bekannte Vorschaubilder werden in Detailkarten sofort und priorisiert angezeigt.
- Backend-Aufrufe werden pro Aktion und Payload zusammengeführt; 429-Antworten aktivieren einen kurzen Cooldown.
- Overlay-Portal-Cleanup ist null-sicher.
