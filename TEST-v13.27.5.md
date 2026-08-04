# Tests 13.27.5

## Lokal ausgeführt

- ZIP-Integrität und Datei-Inventur
- JavaScript-Syntaxprüfung aller tatsächlich textbasierten JS-/MJS-/CJS-Dateien (250 Dateien); `config.js` und `ui.js` sind trotz Endung MP3/ID3-Binärdateien und wurden separat als Legacy-Risiko dokumentiert
- JSON-Validierung
- lokale Script-/CSS-Referenzen
- Versionskonsistenz
- Service-Worker-/Cache-Version
- Suche nach alten 13.27.4-Runtime-Strings
- statische Tabellen-/Storage-/Event-/Service-Inventur
- Root-/`project/`-Spiegelvergleich

## Nicht live geprüft

- produktive Supabase-Tabellen und Constraints
- RLS und Storage Policies im produktiven Projekt
- echte Uploads/Downloads/Löschungen
- Browser-, PWA-, iOS- und Android-Verhalten
- Realtime unter mehreren Nutzern
- externe APIs und Edge Functions

## Aktiver Test

Developer Console → Core 4 → **Media Readiness prüfen**. Erwartet wird ein standardisiertes Ergebnis. Ohne Login/Trip darf die Prüfung Warnungen ausgeben; mit produktivem Client müssen Tabellen-/Bucket-Probes getrennt sichtbar sein.

## Ergebnis der vorhandenen Node-Regressionstests

- 49 vorhandene `*.test.cjs` ausgeführt
- 31 bestanden
- 18 fehlgeschlagen
- Die Fehler betreffen überwiegend ältere, versionsfest verdrahtete oder inzwischen durch den Produktfokus überholte Tests (unter anderem alte Navigation-, Planning- und Versionsannahmen). Sie werden nicht als durch 13.27.5 bestanden dargestellt.
- Neuer zielgerichteter Test `media-readiness-v13.27.5.test.cjs`: bestanden.

## Gesamte bestehende CJS-Testsuite

- 50 Tests ausgeführt.
- 32 bestanden.
- 18 fehlgeschlagen.
- Dieselben 18 Tests schlagen bereits unverändert in der Basis 13.27.4 fehl; 13.27.5 erzeugt keine zusätzlichen Testfehler.
- Die Fehler stammen überwiegend aus historischen, versionsfest codierten oder inzwischen verworfene Planning-/Place-Oberflächen erwartenden Tests. Sie werden nicht als bestanden ausgegeben.

## Referenzprüfung

- Aktive Einstiegspunkte `index.html`, `force-update.html` und `intelligence/console.html`: alle lokalen Script-/CSS-/Assetreferenzen vorhanden.
- 103 fehlende relative Referenzen wurden ausschließlich in archivierten Legacy-HTMLs beziehungsweise alten Content-Fragmenten gefunden. Diese Altlasten sind im Legacy-Audit dokumentiert und wurden nicht stillschweigend repariert.
