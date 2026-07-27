# Luvia 10.2.0 · Core 2.13.2

## Trip Experience Rebuild

- Neues Dashboard als produktive Startseite für modulare Reisen.
- Altes Dashboard bleibt nur noch als isolierte Legacy-Quelle im DOM und wird nicht mehr in den neuen App-Shell übernommen.
- Zentrales Destination-Objekt wird in Dashboard, Reisebearbeitung und Modulen verwendet.
- Neue Modulauswahl speichert ausschließlich über den zentralen Trip Store und spiegelt bei verfügbarer Cloud über `luvia_set_trip_modules`.
- Reisebearbeitung schreibt Reisename, Ziel, Land, Symbol, Farbe und Zeitraum zentral.
- Einladung unterstützt Code, kopierbaren Link, Web Share und QR-Code.
- Nach dem Erstellen einer Reise öffnet das Onboarding direkt die neue Einladung.
- Profil-Einstiege für Bearbeiten, Module und Einladung verwenden die neue Umgebung.
