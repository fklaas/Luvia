# Testbericht – Luvia 13.16.2 / Core 4.16.2

## Automatisierte Regression

Ausgeführt mit:

```bash
for test in tests/*.test.cjs; do node "$test"; done
```

Die Suite umfasst 23 Testdateien und prüft unter anderem:

- Guided Discovery für Registrierung, Profil, Places und Move,
- fokussierten Vorschlagsmodus ohne vorzeitig sichtbaren Katalog,
- Mehrfachauswahl in der Places-Stimmungsszene,
- Mehrfachauswahl in der Move-Prioritätenszene,
- Trennung von globalem Reisekompass und aktuellem Reisemoment,
- `mutatesGlobalProfile: false` für Places und Move,
- Preference-Persistenz und Supabase-Payload,
- strikte Discovery Contracts ohne fachfremde Fallbacks,
- globale Place-Architektur und Capability Routing,
- Move ohne Timeline und Planning,
- Versions-, PWA- und Dokumentationskonsistenz.

## Browser-Laufzeittest

Die echte Guided-Discovery-Laufzeit wurde zusätzlich in Chromium über Playwright ausgeführt. Dabei wurden DOM-Klicks und Übergänge tatsächlich ausgeführt, nicht nur Quelltext durchsucht.

Erfolgreich geprüft:

```text
Places:
culinary → full_meal → context
romantic auswählen
Auswahl bleibt ohne Szenen-Neuaufbau aktiv
Weiter-Button ist aktiv
citywide → Zusammenfassung → Contract

Move:
arrival → rail → priorities
few_changes auswählen
Auswahl bleibt ohne Szenen-Neuaufbau aktiv
Weiter-Button ist aktiv
citywide → Zusammenfassung → Contract

Beide Contracts:
preferenceLayers vorhanden
mutatesGlobalProfile = false
```

Ergebnisse:

```text
PASS · Places context + Move priorities + layered contracts
PASS · Profile overlay suspended above/below correctly and restored
PASS · Guided results hide catalog controls and keep suggestions + gate visible
```

## Syntax, Dateien und Referenzen

```text
191 echte JavaScript-/CJS-Textdateien: Syntax bestanden
2 historische MP3-Dateien mit .js-Endung erkannt und korrekt übersprungen
12 TypeScript-Dateien: syntaktische Transpilation bestanden
39 CSS-Dateien: mit PostCSS geparst
4 JSON-Dateien: validiert
103 lokale Referenzen aus index.html: vorhanden
93 lokale Service-Worker-Referenzen: vorhanden
```

Die beiden historischen Audiodateien sind:

```text
/config.js
/ui.js
```

Sie beginnen mit einem ID3-Header und sind keine JavaScript-Dateien. Sie wurden nicht verändert und nicht fälschlich an `node --check` übergeben.

## Visuelle Browserprüfung

Mit Chromium wurden die Places-Stimmungsszene und die Move-Zusammenfassung gerendert. Kontrolliert wurden:

- organische Wolkenkörper,
- ausgewählte Wolke,
- Profilhinweis zur Trennung der Ebenen,
- offenere Vollbildkomposition,
- mobile-freundliche Touch-Flächen,
- Abschlussdarstellung und Fortschrittsroute.

## Nach dem Verpacken

Die vollständige Testsuite, Syntaxprüfungen, Referenzprüfungen, Browser-Laufzeit und ZIP-Integrität werden erneut aus der entpackten finalen vollständigen ZIP ausgeführt.

## Noch notwendige Live-Tests

Nicht lokal behauptet werden:

- reale Google-Places-Ergebnisse im produktiven Zielgebiet,
- tatsächliche Smartphone-Performance auf mehreren Geräteklassen,
- PWA-Update aus einem bereits installierten 13.16.1-Cache,
- Profil-Overlay und Guided Flow in einer echten angemeldeten Supabase-Sitzung,
- Cloud-Synchronisation auf zwei realen Geräten.

Es gibt für diesen Build keine neue Migration und keine veränderte Edge Function.
