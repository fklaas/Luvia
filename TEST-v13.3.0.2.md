# Testplan – Luvia 13.3.0.2

## Smartphone

- Landingpage passt vollständig in den sichtbaren Viewport.
- Kein vertikales oder horizontales Scrollen auf der öffentlichen Leinwand.
- Headline, Unterzeile und alle Gedankenwolken sind vollständig lesbar.
- „Reise beginnen“, „Anmelden“ und „Ich wurde eingeladen“ sind erreichbar.
- Wechsel zwischen den Masken erfolgt per Fade/Blur, nicht per seitlichem Schieben.
- Freitextfeld wird nicht von Navigation oder Safe Area überlagert.
- Registrierung ist innerhalb der Leinwand scrollbar, falls die Tastatur Platz benötigt.
- Eingabefelder besitzen keinen schwarzen Hintergrund.

## Tablet und Desktop

- Gedankenwolken überdecken keine Headline oder Aktionen.
- Inhalte bleiben zentriert und visuell ausgewogen.
- Authentifizierungskarte bleibt vollständig sichtbar.

## Funktion

- Reiseidee auswählen → Registrierung wird geöffnet.
- Freitext-Reiseidee → Registrierung wird geöffnet.
- Anmelden → Login-Modus wird geöffnet.
- Einladungscode → vorhandener Join-Flow wird aufgerufen.
- Zurück-/Schließen-Schaltflächen funktionieren.
- Kein neuer Zugriff auf localStorage oder sessionStorage.
