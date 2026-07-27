# Luvia v9.18.5 – Destination Intelligence

## Core V2.11.2

Der Destination Context ist jetzt ein vollständiges, wiederverwendbares Zielprofil.

### Neu
- Zeitzone und lokalisierter Zeitzonenname aus der Google Time Zone API
- Sprachcodes, Währung, Locale und Länderflagge aus dem Länderkontext
- Dynamischer Suchradius aus dem Google-Viewport statt starrem Standardwert
- Destination-Schema V4 und persistente Übernahme in bestehende Reisen
- Erweiterte Destination-Diagnose im Backend Dashboard
- Erweiterte Contract-Tests

### Backend
Die Edge Function `luvia-gateway` wurde auf Version 2.11.3 erweitert. `destination.resolve` liefert das vollständige Destination-Profil. Für die Zeitzone muss die Google Time Zone API für denselben API-Key freigeschaltet sein. Fehlt sie, funktionieren Geocoding und Places weiterhin; nur die Zeitzone bleibt leer.

### Keine neuen Tabellen
Core V2.11.2 nutzt weiterhin das bestehende Destination-Modell.

### Nächster Roadmap-Schritt
Core V2.12 – Restaurant Places Integration.
