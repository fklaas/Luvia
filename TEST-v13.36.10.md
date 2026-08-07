# Testplan · Luvia 13.36.10 / Core 4.36.10

## Automatisierbare lokale Checks
- Syntax der geänderten JS-Dateien.
- Build/Core/Service-Worker/Force-Update Versionskonsistenz.
- Keine alte aktive 13.36.9/4.36.9 Referenz.
- Alle lokalen index.html Assets vorhanden.
- Mobile Throw Deck: kein nth-child Freeze; Cursor-relative Sichtbarkeit `rel<0||rel>3`.
- Swipe-Entscheidung ruft persistentes Album Review (`included`/`excluded`) auf.
- Desktop besitzt dieselbe Album-Review-Core-Aktion.
- Responsive Desktop-Card-Width (`--mc-card-width`) wird aus Stage-Fläche berechnet.
- Profile Save enthält Cloud-Readback + Durable-Roundtrip-Validierung.
- Onboarding/Reisekompass merged mit vorhandenem Zustand.
- 13.36.10 Migration enthält Profile-Härtung und Memory-Review-Tabelle/RLS.

## Manuelle Pflicht-Regression nach Deployment
### Persistenz
- Profilfarbe A setzen -> speichern -> Reload -> unverändert.
- Reisekompass mehrere Kategorien setzen -> speichern -> Reload -> unverändert.
- LocalStorage/Site-Daten löschen -> neu anmelden -> Werte unverändert.
- Einen einzelnen Teil des Reisekompasses später ändern -> alle anderen Kategorien bleiben erhalten.

### Memory Mobile
- Mindestens 8 Karten: alle nacheinander swipen.
- Nach Swipe 4 erscheint Karte 5 normal.
- Rechts- und Linkswisch testen; kurzer Swipe muss zurückfedern.
- Drei Folgekarten bleiben als echter Stapel hinter der Frontkarte sichtbar.

### Memory Desktop/Laptop
- 1366×768 bzw. vergleichbare Laptopgröße: Cards müssen sichtbar kleiner als auf großem Desktop sein.
- 1920×1080: Cards dürfen größer sein, ohne Layout zu überfüllen.
- Hover-Lift bleibt weich und Karte liegt über Nachbarkarten.
- Album ←/→ Aktion speichert und ist beim erneuten Öffnen wieder markiert.
