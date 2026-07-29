# Luvia 13.4.6.4 – Travel Memory Ambient Canvas

## Änderungen
- Der globale App-Hintergrund reagiert stärker auf die aktive Reisefarbe, bleibt aber warm und ruhig.
- Neun zusätzliche, halbtransparente Reise- und Erinnerungselemente wurden in eine zentrale Ambient-Ebene aufgenommen.
- Enthalten sind abstrahierte Motive für Kamera, Herz, Standort, Ticket, Route, Sonne, Wolke und Lichtmomente.
- Die Elemente liegen hinter allen Inhalten, blockieren keine Eingaben und werden mobil reduziert.
- Bei `prefers-reduced-motion` werden sämtliche Ambient-Bewegungen deaktiviert.
- Der Farbverlauf des großen Reise-Headers wurde deutlich zurückgenommen und näher an eine weiße Karte gerückt.

## Architektur
Die Ambient-Ebene ist Bestandteil der globalen App Shell. Sie wird nicht in einzelnen Modulen dupliziert und übernimmt automatisch die jeweilige Reisefarbe über `--trip-accent`.

## Bekannte Grenzen
Die Dekorationen sind bewusst abstrakt und rein visuell. Sie enthalten keine fachlichen Daten und werden nicht gespeichert.
