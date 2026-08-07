# Luvia 13.36.11 · Core 4.36.11
## Memory Review Feedback & Radial Deck Composition

Basis: 13.36.10 / Core 4.36.10.

## Mobile Review Feedback
- Tinder-artiges Swipe-away bleibt unverändert erhalten.
- Während des Ziehens erscheint nun richtungsabhängig ein sichtbares Overlay:
  - links: `Nicht ins Album`
  - rechts: `Für Album behalten`
- Die Stärke des Overlays folgt der Swipe-Distanz und zeigt vor dem Loslassen, welche persistente Entscheidung ausgelöst wird.
- Nach Überschreiten der Schwelle wird die gewählte Richtung kurz bestätigt.
- Nach der letzten Karte erscheint kein funktionsloser Missionszustand mehr, sondern ein echter Abschluss mit Anzahl `included`/`excluded`.
- `Auswahl erneut prüfen` startet den Stapel erneut; `Zurück zu Erinnerungen` schließt die Review-Ansicht.

## Desktop Album Review
- Die bereits vorhandenen Review-Aktionen waren durch `overflow:hidden` außerhalb der Card abgeschnitten.
- Die Aktionen liegen nun sichtbar innerhalb der Karte und erscheinen bei Hover/Focus.
- Desktop verwendet dieselbe persistente Core-Aktion `setAlbumReview()` wie Mobile.
- Bereits gespeicherte Entscheidungen werden weiterhin eingelesen und visuell markiert.

## Radial Deck Composition
- Die bisherige freie Scatter-/Anchor-Suche wurde für Desktop durch eine responsive radiale/elliptische Komposition ersetzt.
- Ausgangspunkt ist immer der Mittelpunkt der verfügbaren Memory-Stage.
- Jede Kartenmitte wird innerhalb einer responsiven Ellipse um diesen Mittelpunkt platziert.
- Winkel und Radius variieren zufällig, bleiben aber kontrolliert.
- Mindestabstand und Überlappung werden bei der Kandidatenauswahl bewertet.
- Rotation bleibt klein (maximal ca. ±3,5°), damit der Effekt nach hingeworfenen Karten aussieht, ohne unruhig zu werden.
- Laptop-/kleinere Desktop-Flächen erhalten zusätzlich eine kleinere maximale Card-Breite.

## Backend
Keine neue Migration und keine neue Edge Function.
Die mit 13.36.10 eingeführte Migration `20260807161000_core_v4_36_10_profile_persistence_memory_review.sql` bleibt Voraussetzung für persistente Album-Review-Entscheidungen.
