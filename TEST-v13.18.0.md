# Testbericht 13.18.0 / Core 4.18.0

Ausgeführt auf dem finalen Arbeitsstand:

- 34 Node-Regressionstests bestanden
- 183 echte JavaScript-Dateien mit `node --check` geprüft
- 2 historische ID3-Dateien mit `.js`-Endung erkannt und ausgeschlossen
- 21 TypeScript-Dateien mit TypeScript transpiliert
- 40 CSS-Dateien mit PostCSS geparst
- 6 JSON-/Webmanifest-Dateien validiert
- 119 lokale Referenzen aus `index.html` geprüft
- 105 Service-Worker-Referenzen geprüft
- Journey-Knowledge-Graph-Verträge geprüft
- Timeline-, Place-, Restaurant- und Reservierungsauflösung statisch und per Regression geprüft
- Event-basierte Cache-Invalidierung geprüft
- Multi-Step-Orchestrator, Tool Registry, Domain Registry und Evidence Store geprüft
- Move-ohne-Timeline und harte Place Contracts weiterhin geprüft

Nicht ausgeführt:

- Live-Supabase-Migration
- echter OpenAI-Mehrschrittaufruf
- produktive Edge-Function-Deployments
- Live-RLS-Test mit zwei Benutzern
- echte Timeline-/Restaurantdaten des Nutzerprojekts
- PWA-Endgerätetest
