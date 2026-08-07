# Luvia 13.34.0 / Core 4.34.0 — Memory Render Engine Rebuild

## Ziel
Memory Moments und Memory Journeys verlassen den bisherigen CSS-Szenenansatz. Die neue Memory-Erlebnis-Schicht nutzt einen eigenen TypeScript-Renderer mit WebGL2/GLSL, Canvas-Compositing und einem separaten Export-Renderer.

## Render Engine
- `app/memory-render-engine.ts` ist die neue TypeScript-Quelle.
- WebGL2-Fragmentshader rendern Himmel, Route, Stadt, Tisch/Licht, Meer/Strand, Studio und Premiere kontinuierlich.
- Die Flugroute ist eine gerichtete A→B→C→D→E→F→G-Bewegung. Sie ping-pongt nicht mehr zurück.
- Szenen bleiben in einem persistenten Frame. Nur die Interaktionsebene wird weich gewechselt, wodurch das bisherige Vollbild-Flackern vermieden wird.
- CSS ist nur noch Layout/Accessibility-Schicht; die bewegte Szenerie selbst wird gerendert.

## AI Memory Composer
- Neue Backend-Capability `memory.compose`.
- Ein Request kann gleichzeitig Titel, Erinnerungstext, Kurz-Caption, Highlights und verwendete Evidenz erzeugen.
- Bis zu drei echte Reisefotos können im selben Request visuell ausgewertet werden.
- Kein separater `media.describe`-Request vor jedem Titel-/Text-Request mehr.
- Rate-Limit ist nach Authentifizierung pro Nutzer + Capability getrennt statt pauschal pro IP + `brain.run`.
- 429 wird im Client gebremst; die Oberfläche fällt bei Überlastung auf einen sachlichen, belegten lokalen Vorschlag zurück statt weiter Requests zu feuern.

## Moments
- Text liegt immer auf einem lesbaren Untergrund.
- Eigene gerenderte Szenen für Bildmoment, Wolkenraum, Sinneseindrücke, Bildschnitt, Memory Pass und Premiere.
- Cover hat einen klaren doppelten Auswahlrahmen und eindeutiges `✓ Euer Cover`.
- Gewichtung: Nebenrolle / Wichtig / Herzstück.
- Keine Sterne.

## Journeys
- Tage werden einzeln wie Reisetickets bearbeitet statt als lange Formularliste.
- Moments werden als bildbasierte Szene mit drei Fotos betreten.
- Tischszene sammelt Genuss, Menschen und Atmosphäre.
- Meer-/Strandszene wird durch den WebGL-Renderer animiert und ist kein zweigeteilter CSS-Hintergrund.
- Final Cut priorisiert Inhalte für alle Ausgaben.

## Exporte
- Story = 3-Frame Story Set als ZIP, gemischt aus Cover, mehreren gewichteten Fotos, Stimmen, Storytext und Sinneseindrücken.
- Post = gestaltete Mehrfoto-Collage.
- Reel/TikTok = echter MP4/H.264-Export, sofern der Browser MP4-MediaRecorder unterstützt.
- Luvia Film = längerer MP4/H.264-Export.
- WebM wird nicht mehr stillschweigend als Ersatz erzeugt.

## Unverändert
- Gallery Rendering / Realtime / Upload Batching
- Media Core
- Places / Foursquare
- Memory-Datenmodell und bestehende Tabellen
