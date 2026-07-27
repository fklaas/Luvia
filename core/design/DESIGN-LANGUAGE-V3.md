# Luvia Design Language V3

Verbindliche Grundlage für alle aktuellen und zukünftigen Oberflächen.

## Grundsätze

- Ausschließlich moderne Sans-Serif-Typografie.
- Emotional durch Farbe, Fotografie, Bewegung und Inhalt – nicht durch verspielte Schriftarten.
- Pro Oberfläche entweder dezenter Rand oder Schatten; keine schwere Kombination.
- Reiseakzent steuert aktive Zustände, Hauptaktionen, Marker und ausgewählte Chips.
- Neue Module verwenden `LuviaUIKit`, `.lv-module`, `.lv-ui-card`, `.lv-ui-chip` und die zentralen Zustandskomponenten.
- Desktop: 12 Spalten, Tablet: 8 Spalten, Mobil: 4 Spalten.
- Alle Dialoge laufen über `LuviaUI`.
- Alle Animationen verwenden zentrale Dauer- und Easing-Tokens und respektieren reduzierte Bewegung.

## Typografie

- Familie: Manrope mit systemnahen Fallbacks.
- Display: 600, enge Laufweite, kurze Zeilen.
- Headings: 600.
- Body: 400–500, großzügige Zeilenhöhe.
- Buttons und Labels: 600–700, keine Black-/900-Gewichte.

## Modulvertrag

Jedes Modul besitzt:

1. Hero
2. optionale Toolbar
3. Content
4. Loading State
5. Empty State
6. Error State
7. Dialoge über `LuviaUI`

Neue parallele Designsysteme oder modulspezifische Schriftfamilien sind nicht zulässig.
