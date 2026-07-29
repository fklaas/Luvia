# Luvia 13.3.1.1 – Stay Navigation Persistence & Global Module Transition

**Core:** 4.3.1.1  
**Build:** 13.3.1.1

## Änderungen

- Unterkunftsmodul an den tatsächlichen Mount-Vertrag des zentralen Module Managers angepasst. Der Modul-Host wird nun korrekt aufgelöst und die Stay-Oberfläche rendert beim Öffnen.
- Cloud-Hydrierung lädt die Modulkonfiguration jeder Reise über `luvia_get_trip_modules` gemeinsam mit der Reise. Aktivierte Module bleiben dadurch nach Reload und erneuter Anmeldung erhalten.
- Modulaktionen „Unterkünfte öffnen“ und „Restaurants öffnen“ aus dem Dashboard-Header entfernt. Der Einstieg erfolgt ausschließlich über die horizontale Navigation.
- Der bisher restaurantspezifische Fade-/Intro-Übergang wurde in einen globalen App-Shell-Übergang überführt. Dashboard, Restaurants, Unterkünfte und zukünftige Navigationsmodule nutzen denselben Übergang.
- Asset-, App-Shell-, Runtime- und Service-Worker-Versionen auf 13.3.1.1 angehoben.

## Architektur

Die Persistenz bleibt cloud-first. Supabase ist für die aktivierten Reisemodule autoritativ; der lokale Speicher bleibt lediglich Cache und Legacy-Spiegel. Es wurde keine zweite Modulkonfiguration eingeführt.

## Bekannte Grenzen

Für die Unterkunftssuche und das Speichern muss die Migration aus Build 13.3.1 sowie die passende `luvia-gateway`-Version bereits deployed sein.
