# Luvia 13.6.3 / Core 4.6.3 — Global Place Action & Boot Stability Closure

## Behoben
- Sehenswürdigkeiten-Modul startet wieder; fehlende globale Render-Funktion restauriert.
- Favorit und Zur Timeline sind in jeder globalen Place-Detailkarte verbindliche Core-Aktionen.
- Beide Aktionen verwenden immer die Akzentfarbe der aktiven Reise.
- Timeline-Punkt-Ereignisse tragen fachliche Typnamen statt generischer Feldbezeichnungen wie „Zeitpunkt“.
- Restaurants erscheinen als „Restaurant · …“, Sehenswürdigkeiten als „Sehenswürdigkeit · …“.
- PWA aktiviert Updates nicht mehr automatisch während des Starts. Dadurch entfällt der zweite Seitenreload mit erneutem Intro.
- Der erwartete PWA-Cache entspricht dem aktuellen Build.
- Boot-Hydration wird für denselben angemeldeten Benutzer nicht doppelt ausgeführt.
- Modulübergang/Fade dauert 620 ms.

## Architektur
Die Aktionsdarstellung ist jetzt im globalen Place Detail Service und Place UI Action Contract erzwungen. Einzelne Module dürfen keine abweichende Primäraktionsfarbe mehr definieren.
