# Testbericht – Luvia 13.17.0 / Core 4.17.0

## Build

```text
Luvia 13.17.0
Core 4.17.0
Luvia Brain Foundation
PWA Cache: luvia-shell-v13.17.0
```

## Tatsächlich lokal ausgeführte Tests

Die folgenden Prüfungen wurden im vollständigen Arbeitsverzeichnis ausgeführt und werden nach der Verpackung nochmals aus der entpackten finalen Projekt-ZIP wiederholt:

- 32 Node-basierte Regressionstests für bestehende und neue Luvia-Verträge
- zentraler `LuviaAI`-Runtime- und Fallback-Test
- serverautoritatives Luna-/Terra-/Sol-Modellrouting
- minimale, bereinigte Context-Policy
- sichere Edge-Function-Integration über die Responses API
- Structured-Output-Schemas und Output-Normalisierung
- Places-/Move-AI-Planung erst nach hartem Discovery Contract
- Candidate Reranking erst nach fachlicher Provider-Validierung
- Move weiterhin ohne Timeline, `planned_at` und Planning-Capability
- Dashboard Brain und appweiter Luvia-Trigger
- bestätigungspflichtige Timeline-Vorschläge
- AI-Lernsignale getrennt von `user_profiles`
- bewusste Bestätigung oder Ablehnung von Lernsignalen im Profil
- AI-Datenbankmigration, Tabellen, RPC, RLS und Indizes
- Preference Core, Cloud-Payload und Fehler-Rollback
- Guided Discovery und Travel Canvas Regression
- Versions-, PWA-, Dokumentations- und Deployment-Konsistenz

## Vollständige statische Prüfung

- 211 JavaScript-/CJS-Textdateien mit `node --check`
- 2 historische ID3-Audiodateien mit falscher `.js`-Endung erkannt und bewusst von der JavaScript-Prüfung ausgenommen: `config.js`, `ui.js`
- 21 TypeScript-Dateien mit TypeScript `transpileModule` geprüft
- 40 CSS-Dateien mit PostCSS geparst
- 6 JSON-/Webmanifest-Dateien geparst
- 115 lokale Referenzen aus `index.html` auf vorhandene Dateien geprüft
- 105 Einträge des Service-Worker-App-Shells auf vorhandene Dateien geprüft

## Sicherheits- und Architekturprüfungen

- kein `OPENAI_API_KEY` im veröffentlichten Browsercode
- OpenAI-Aufruf ausschließlich serverseitig über `luvia-intelligence`
- `store: false` im Responses-Aufruf
- datensparsamer `safety_identifier`
- keine vollständigen Prompts in der eigenen Usage-Telemetrie
- AI-Tabellen mit benutzergebundener RLS
- keine direkte KI-Datenbankmutation außerhalb bestehender Core-Verträge
- schreibende AI-Aktionen bleiben Drafts bis zur sichtbaren Bestätigung
- explizite Profilpräferenzen, temporärer Modulmoment und Lernsignale bleiben getrennt
- deterministischer Fallback bei fehlendem Key, Timeout, Rate Limit oder Providerfehler

## ZIP-Prüfung

Nach Erstellung der beiden Archive wurden geprüft:

- Integrität der vollständigen ZIP
- Integrität der Changed-Files-ZIP
- erneute Ausführung sämtlicher 32 Regressionstests aus der entpackten finalen vollständigen ZIP
- erneute Syntax-, TypeScript-, CSS-, JSON-, Index- und Service-Worker-Prüfung
- SHA-256-Prüfsummen beider Archive

Ergebnis: Beide ZIP-Archive waren vollständig lesbar; sämtliche oben genannten Prüfungen bestanden auch aus der entpackten finalen vollständigen ZIP.

## Nicht ausgeführte Live-Tests

Die folgenden Live-Tests sind ohne produktiven OpenAI-Key und ohne schreibenden Zugriff auf das bereitgestellte Supabase-Projekt nicht ausgeführt und werden ausdrücklich nicht als bestanden behauptet:

- echter OpenAI-Responses-Aufruf mit Luna, Terra und Sol
- reales `supabase db push`
- reales Deployment von `luvia-intelligence` und `luvia-gateway`
- Authentifizierung und RLS mit zwei echten Benutzersitzungen
- reale Usage-/Token-/Kostenmessung
- Live-Places- und Live-Move-Reranking mit Google-Providerdaten
- Timeline-Übernahme über die produktive Supabase-Datenhaltung
- PWA-Update auf einem bereits installierten Smartphone
- Gerätewechsel und parallele Anmeldung

Diese Live-Tests sind in `LUVIA-AI-SETUP-v13.17.0.md` als Schritt-für-Schritt-Abnahme beschrieben.
