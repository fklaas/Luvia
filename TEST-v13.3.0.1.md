# Testplan – Luvia 13.3.0.1

## Öffentliche Leinwand

- Startseite besitzt bei 320 px bis Desktopbreite kein vertikales Seitenscrolling.
- `Reise beginnen` schiebt zur Gedanken-Folie.
- Auswahl einer Idee schiebt zur Registrierung.
- `Anmelden` schiebt direkt zur Login-Folie.
- Zurück- und Schließen-Aktionen wechseln die Leinwand ohne Overlay.
- Einladung öffnet eine eigene Leinwand und akzeptiert einen Code.

## Responsive

- iPhone Hochformat und Querformat
- kleine Android-Geräte ab 320 px
- Tablet Hoch- und Querformat
- Desktop ab 1024 px
- kurze Viewports ab 667 px Höhe

## Verhalten

- keine Verwendung von `localStorage` oder `sessionStorage` in `app/public-entry.js`
- `prefers-reduced-motion` deaktiviert Animationen und Übergänge
- Authentifizierungsformular verwendet weiterhin die zentrale `ParisAuthUI`
- nach erfolgreicher Authentifizierung wird die öffentliche Viewport-Sperre entfernt
