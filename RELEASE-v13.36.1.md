# Luvia 13.36.1 / Core 4.36.1 – Memory Card Deck Experience

## Ziel
Memory Cards werden als haptische Kartenstapel statt als statische Kacheln erlebt.

## Enthalten
- sequentielle Fade/Blur-Transitions ohne visuelles Überlagern alter und neuer Schritte
- Zurück-Navigation im Memory-Card-Erstellungsflow
- dezente Hover-, Lift- und Focus-Motion
- eigenständige Card-Oberflächen je Card-Typ, auch ohne Foto
- Memory Moments als leicht versetzte Kartenstapel auf der Übersicht
- Stack-Fächerung auf Hover (Desktop) und Tap/Klick-Öffnung
- Fullscreen-Deck-Spread ohne klassisches Dialogfenster
- kontrolliert unregelmäßige Positionierung und Rotation der Cards
- einzelne Cards aus dem Spread weich in den Vordergrund zoombar
- erneuter Einstieg in bereits fertige Memory Moments
- responsive Deck-Übersicht: mehrere Spalten auf Desktop, eine Spalte auf Mobile

## Stabilität
Keine Änderung an Gallery Rendering, Upload-Batching, Gallery Realtime, Media Core, Places oder Foursquare.
Keine neue SQL-Migration. Kein Edge-Function-Deployment erforderlich.
