# Luvia Build 13.8.1 / Core 4.8.1

## Places UI Refinement & Reusable Insight Cards

Build 13.8.1 verfeinert die globale Places-Oberfläche, ohne neue fachliche Datenmodelle oder parallele Modulstrukturen einzuführen.

### Places-Hub

- festes Desktop-Raster mit maximal drei Spalten
- zwei Spalten auf Tablet-Ansichten und eine Spalte auf Mobilgeräten
- modernisierte, großzügigere Place-Kacheln
- globale Reise-Akzentfarbe und Theme-Tokens
- verbesserte Typografie, Abstände, Schatten und Hover-/Fokuszustände
- vollständig umbrechende Titel, Beschreibungen und Tags
- reduzierte Bewegung bei aktivierter Betriebssystem-Einstellung `prefers-reduced-motion`

### Globale Insight Cards

Der universelle Place-UI-Core stellt neu `LuviaPlaceUI.insightGrid(...)` bereit. Der Renderer kann typabhängige Informationen mit folgenden Bestandteilen darstellen:

- Icon und fachliche Bezeichnung
- hervorgehobener Wert
- Datenquelle
- Sicherheit der Ableitung
- Hinweistext für automatische oder vor Ort zu prüfende Empfehlungen

Die Fotospot-Detailkarte verwendet den neuen globalen Renderer für Lichtmoment, beste Lichtzeit, Blickrichtung, Motiv, Indoor/Outdoor, Stativ und Zugang.

### Architektur

- keine neue lokale Detailkarten-Shell
- keine eigene Fotospot-Card-Komponente
- keine Änderungen an Favoriten, Timeline, Commands oder Cloud-Persistenz
- keine SQL-Migration
- globale Places-Architekturdokumentation um den Insight-Card-Vertrag ergänzt

### Bekannte Grenzen

- Die tatsächliche visuelle Wirkung der Akzentflächen hängt von der jeweils aktiven Reisefarbe ab und soll nach dem produktiven Deployment zusätzlich in mindestens einer hellen und einer dunklen Reisefarbe geprüft werden.
- Für diesen Build wurden keine Cloud-Datenmodelle oder Providerantworten verändert.
