# Test 13.0.4.4

- `/intelligence/console.html` öffnen: Oberfläche muss ohne Gateway-Request sichtbar werden.
- Services-Tab öffnen: Karten müssen erscheinen.
- `/intelligence/test.html` öffnen: Seite muss ohne Anmeldung laden; Datenbankprüfung wird kontrolliert übersprungen.
- Browserkonsole prüfen: keine Request-Flut durch `recommendation.event`, keine blockierenden CORS-Preflights aus Diagnosepfaden.
- Einzelne Service-Diagnose erst per Button öffnen.
