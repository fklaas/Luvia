# Testbericht – Luvia 13.16.1 / Core 4.16.1

## Lokale automatisierte Prüfung

Der finale Build wird nach dem Verpacken erneut aus der entpackten vollständigen ZIP getestet. Die Tests umfassen:

- JavaScript-/CJS-Syntaxprüfung
- TypeScript-Syntaxtranspilation
- JSON-Validierung
- lokale Referenzen aus `index.html`
- Service-Worker-Shell-Referenzen
- Preference-Schema V3 und Legacy-Normalisierung
- `LuviaUserPreferences` Laufzeit, Kategorieänderung und Rollback
- explizites Supabase-RPC-Payload von `LuviaProfileService`
- Registrierungs-, Profil-, Places- und Move-Integration
- strikte Discovery Contracts und Google-Place-Typen
- Move ohne Timeline und ohne Planning
- migrationssichere SQL-Struktur und RLS
- Versionskonsistenz
- ZIP-Integrität

## Tatsächlich ausgeführte lokale Ergebnisse

```text
21 Regressionstests: bestanden
189 JavaScript-/CJS-Textdateien: Syntax bestanden
12 TypeScript-Dateien: syntaktische Transpilation bestanden
4 JSON-Dateien: validiert
102 lokale Referenzen aus index.html: vorhanden
94 Service-Worker-App-Shell-Referenzen: vorhanden
Move-Version/Timeline-Verbot: bestanden
```

Zwei bereits im Ausgangsprojekt vorhandene MP3-Dateien tragen historisch die Endung `.js` (`ui.js` und `config.js`). Sie wurden als Audiodateien erkannt und deshalb nicht fälschlich an `node --check` übergeben. Sie wurden in diesem Build nicht verändert.

## Automatisierte Regressionstests

```bash
for test in tests/*.test.cjs; do node "$test"; done
```

Die Suite enthält insbesondere:

```text
tests/guided-discovery-preferences.test.cjs
tests/guided-discovery-integration.test.cjs
tests/user-preference-core.test.cjs
tests/profile-preference-payload.test.cjs
tests/preference-database-migration.test.cjs
tests/move-no-timeline-v13.16.1.test.cjs
tests/discovery-contract-strictness.test.cjs
tests/move-domain-separation.test.cjs
tests/release-version-consistency.test.cjs
```

## Manuelle Abnahme nach Deployment

### Registrierung

1. Neuen Benutzer anlegen und alle Vorlieben ausfüllen.
2. E-Mail bestätigen und anmelden.
3. Prüfen, dass genau eine `user_profiles`-Zeile existiert.
4. Abmelden und erneut anmelden.
5. Prüfen, dass alle Vorlieben unverändert geladen werden.

### Profil

1. Profil → Vorlieben öffnen.
2. Eine Kategorie ändern und speichern.
3. Reload durchführen.
4. Auf einem zweiten Browser beziehungsweise Gerät anmelden.
5. Prüfen, dass dieselbe Änderung vorhanden ist.
6. Netzwerk vor dem Speichern unterbrechen und prüfen, dass kein Erfolg vorgetäuscht wird.

### Places

1. Global vegetarisch hinterlegen.
2. Places öffnen und Profilhinweis kontrollieren.
3. Für eine einzelne Suche abweichend wählen.
4. Prüfen, dass das Profil dadurch nicht verändert wird.
5. Fachfremde Treffer und stille breite Fallbacks ausschließen.

### Move

1. Mobilitäts- und Barrierefreiheitswerte hinterlegen.
2. Move öffnen und Profilhinweis/Discovery Contract prüfen.
3. Fähre, Bahn und Flughafen getrennt testen.
4. Sicherstellen, dass kein Timeline-Button erscheint und kein `planned_at` geschrieben wird.

### Datenschutz

1. Benutzer A und Benutzer B anlegen.
2. Mit Benutzer A ausschließlich dessen Profil lesen/ändern.
3. Direkten Zugriff auf die UUID von Benutzer B versuchen.
4. Erwartet: kein Lesen und kein Schreiben fremder Werte.

## Noch notwendige Live-Tests

Nicht lokal behauptet werden:

- tatsächliches `supabase db push` gegen das produktive Projekt
- echte Triggerausführung in `auth.users`
- RLS-Gegentest mit zwei realen Supabase-Sitzungen
- Gerätewechsel/PWA-Neuinstallation
- reales gleichzeitiges Speichern auf zwei Geräten

Diese Punkte müssen nach Deployment im bereitgestellten Supabase-Projekt ausgeführt werden.
