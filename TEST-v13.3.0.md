# Testplan – Luvia 13.3.0

## Öffentlicher Einstieg

- ausgeloggter Aufruf zeigt die neue Landingpage
- Hero, Gedankenformen und Abschnitte reagieren auf Desktop und Mobil korrekt
- „So funktioniert es“ scrollt zum Erklärbereich
- Reduced Motion deaktiviert schwebende Animationen

## Guided Journey Entry

- „Reise beginnen“ öffnet die Frage „Woran denkst du gerade?“
- jede Gedankenoption führt zur Registrierung
- freie Texteingabe wird übernommen
- Zurück führt zur Gedankenauswahl
- Schließen stellt die Landingpage wieder bedienbar her
- der Snapshot enthält ausschließlich In-Memory-Zustand

## Authentifizierung

- Anmeldung verwendet den bestehenden ParisAuth-Flow
- Registrierung verwendet den bestehenden Supabase-Sign-up-Flow
- Apple- und Google-Provider bleiben verfügbar
- Einladungscode-Einstieg bleibt erreichbar
- angemeldete Nutzer gelangen weiterhin in den bestehenden App-Bereich

## Technisch

- JavaScript-Syntaxprüfung für neue und geänderte JS-Dateien
- keine Verwendung von localStorage/sessionStorage im neuen Entry-Modul
- Service-Worker-Cache auf 13.3.0 erhöht
