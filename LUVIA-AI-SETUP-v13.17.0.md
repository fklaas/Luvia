# Schritt-für-Schritt: Luvia AI einrichten

Diese Anleitung enthält ausschließlich die Schritte, die du nach dem Download selbst erledigen musst.

## Teil A – OpenAI API vorbereiten

**Schritt 1 beginnt mit der Einrichtung eines getrennten OpenAI-API-Projekts.**

### 1. API-Plattform öffnen

Melde dich mit deinem OpenAI-Konto in der OpenAI API Platform an. Dein ChatGPT-Plus-Abonnement bezahlt die API nicht mit; die API besitzt eine eigene Abrechnung.

### 2. API-Abrechnung aktivieren

Öffne in der API Platform den Bereich **Billing**.

- Zahlungsmethode hinzufügen oder Prepaid-Guthaben kaufen.
- Für den Start nur ein kleines kontrolliertes Guthaben verwenden.
- Bei Auto-Recharge genau prüfen, ob es aktiviert ist.
- Einen niedrigen Benachrichtigungsschwellenwert setzen.

### 3. Eigenes Projekt erstellen

Unter **Projects**:

1. **Create project** wählen.
2. Name: `Luvia Production`
3. Optional Beschreibung: `Production AI backend for myluvia.app`
4. Projekt erstellen und aktiv auswählen.

### 4. Modelle und Budget konfigurieren

Im Projekt unter **Limits** beziehungsweise **Model Usage**:

- `gpt-5.6-luna` freigeben,
- `gpt-5.6-terra` freigeben,
- `gpt-5.6-sol` freigeben,
- ein monatliches Budget und zusätzliche Warnschwellen einrichten,
- beachten, ob dein angezeigtes Limit nur warnt oder Anfragen tatsächlich stoppt.

Empfohlener Start:

```text
Luna: hohe Menge / kurze Klassifikation
Terra: normale Luvia-Entscheidungen
Sol: nur komplexe Planung
```

### 5. Geheimen API-Key erstellen

Im Projekt unter **API Keys**:

1. **Create new secret key** wählen.
2. Name: `luvia-production-supabase`
3. Nach Möglichkeit einen auf das Projekt und den benötigten Responses-Endpunkt beschränkten Key verwenden.
4. Key einmal kopieren und sicher zwischenspeichern.

Wichtig:

- Der Key wird später nicht erneut vollständig angezeigt.
- Nicht in diesen Chat senden.
- Nicht in GitHub speichern.
- Nicht in `core.js`, `runtime-config.json` oder eine Browserdatei schreiben.

## Teil B – Projekt lokal vorbereiten

### 6. Vollständige ZIP entpacken

Entpacke:

```text
luvia-v13.17.0-core-v4.17.0-luvia-brain-foundation.zip
```

Öffne anschließend PowerShell oder Terminal direkt in diesem entpackten Ordner.

### 7. Supabase CLI prüfen

```bash
supabase --version
```

Falls der Befehl nicht gefunden wird, zuerst die Supabase CLI installieren und das Terminal neu öffnen.

### 8. Bei Supabase anmelden

```bash
supabase login
```

Der Browser öffnet sich zur Bestätigung.

### 9. Luvia-Projekt verbinden

```bash
supabase link --project-ref yiadkcxgyzdgyadnhyqe
```

## Teil C – Datenbank und Secrets

### 10. Migration anwenden

```bash
supabase db push
```

Bestätige, dass folgende Migration angewendet wird:

```text
20260803_038_core_v4_17_0_luvia_brain_foundation.sql
```

Danach sollten in Supabase vorhanden sein:

```text
ai_learning_signals
ai_interaction_events
ai_action_proposals
ai_usage_events
```

### 11. OpenAI-Key als Supabase Secret setzen

Ersetze nur `DEIN_OPENAI_API_KEY` durch den kopierten Key:

```bash
supabase secrets set OPENAI_API_KEY="DEIN_OPENAI_API_KEY"
```

### 12. Modelle festlegen

```bash
supabase secrets set LUVIA_AI_MODEL_FAST="gpt-5.6-luna"
supabase secrets set LUVIA_AI_MODEL_DEFAULT="gpt-5.6-terra"
supabase secrets set LUVIA_AI_MODEL_DEEP="gpt-5.6-sol"
```

### 13. Erlaubte Domains setzen

```bash
supabase secrets set LUVIA_ALLOWED_ORIGINS="https://myluvia.app,https://www.myluvia.app"
```

### 14. Secrets kontrollieren

```bash
supabase secrets list
```

Es müssen die Namen erscheinen. Der geheime Key-Wert selbst darf nicht ausgegeben werden.

## Teil D – Functions und Frontend veröffentlichen

### 15. Luvia Intelligence deployen

```bash
supabase functions deploy luvia-intelligence
```

### 16. Gateway deployen

```bash
supabase functions deploy luvia-gateway
```

Das Gateway enthält in diesem Build nur die aktualisierte Build-/Core-Diagnose, wurde aber verändert und soll deshalb ebenfalls deployt werden.

### 17. Änderungen nach GitHub pushen

```bash
git add .
git commit -m "feat(ai): establish Luvia Brain as central app intelligence"
git push
```

Warte, bis das Hosting-Deployment erfolgreich abgeschlossen ist.

## Teil E – PWA sauber aktualisieren

### 18. Alten Cache verlassen

1. Alle Browser-Tabs mit Luvia schließen.
2. Installierte Luvia-PWA vollständig beenden.
3. `https://myluvia.app/force-update.html` öffnen.
4. Update ausführen beziehungsweise Seite vollständig laden lassen.
5. Luvia neu öffnen.

### 19. Version kontrollieren

Erwartet:

```text
App: 13.17.0
Core: 4.17.0
PWA Cache: luvia-shell-v13.17.0
```

## Teil F – Funktionstests

### 20. AI-Health prüfen

Angemeldet in Luvia die Entwicklerkonsole öffnen und ausführen:

```javascript
await window.LuviaAI.health()
```

Erwartet:

```text
configured = true
provider = openai
```

Falls `AI_NOT_CONFIGURED` erscheint:

```bash
supabase secrets list
supabase functions deploy luvia-intelligence
```

noch einmal ausführen.

### 21. Dashboard prüfen

- Reise-Dashboard öffnen.
- Das persönliche Luvia-Briefing muss erscheinen.
- **Neu denken** beziehungsweise Aktualisieren ausführen.
- Der Text muss zur aktiven Reise passen und darf keine erfundenen Buchungen behaupten.

### 22. Places prüfen

- Guided Discovery starten.
- Eine konkrete Stimmung und Kategorie auswählen.
- Vorschläge öffnen.
- Prüfen, ob AI-Begründungen zur Auswahl passen.
- Prüfen, ob unsichere Informationen als unbekannt markiert werden.
- Ein fachlich falscher Google-Typ darf weiterhin nicht erscheinen.

### 23. Move prüfen

- Guided Discovery in Move starten.
- Verkehrsmittel und Prioritäten wählen.
- Prüfen, ob die Gewichtung zur Auswahl passt.
- Es darf keinen Timeline-Button, kein `planned_at` und keine Planning-Capability geben.

### 24. Bestätigung vor Änderungen prüfen

- Dashboard-Aktion **Tag gemeinsam prüfen** starten.
- Vorschlag lesen.
- Zuerst **Ablehnen** wählen: Timeline darf unverändert bleiben.
- Neuen Vorschlag erzeugen.
- Nur bei sinnvoller Änderung bewusst bestätigen.
- Danach prüfen, ob ausschließlich die bestätigten Core-Kommandos ausgeführt wurden.

### 25. Supabase-Daten prüfen

Im Table Editor:

- `ai_usage_events`: Modell, Tokenanzahl, Dauer und Status; keine Prompts.
- `ai_action_proposals`: Draft/Accepted/Rejected/Executed.
- `ai_learning_signals`: belegte Signale und Konfidenz.
- `user_profiles`: darf durch ein bloß abgeleitetes Lernsignal nicht heimlich verändert werden.

### 25a. Lernsignale im Profil prüfen

- Profil → **Vorlieben** öffnen.
- Unter **Luvias lernendes Gedächtnis** prüfen, ob ein abgeleitetes Signal als offen erscheint.
- **Nicht relevant** testen: Das Signal muss verschwinden, `user_profiles` darf unverändert bleiben.
- Ein weiteres Signal bewusst mit **In Reisekompass übernehmen** bestätigen.
- Erst danach darf die passende explizite Präferenz in `user_profiles` erscheinen; das Signal erhält den Status `confirmed`.

### 26. RLS mit zwei Benutzern prüfen

- Benutzer A und Benutzer B in getrennten Browserprofilen anmelden.
- Sicherstellen, dass jeder nur eigene Learning Signals, Events, Proposals und Usage Events sieht.

## Teil G – Kosten und Betrieb beobachten

### 27. OpenAI Usage prüfen

In der OpenAI API Platform regelmäßig **Usage** öffnen und nach dem Projekt `Luvia Production` filtern.

Achte besonders auf:

- ungewöhnlich viele Sol-Aufrufe,
- sehr große Input-Kontexte,
- wiederholte Fehler/Retry-Schleifen,
- unerwartete Kostenanstiege.

### 28. Supabase Function Logs prüfen

Im Supabase Dashboard **Edge Functions → luvia-intelligence** öffnen und dort **Invocations** sowie **Logs** prüfen. Die Einträge sollen Statuscodes, Laufzeiten und technische Fehlercodes zeigen, aber keine vollständigen privaten Prompts oder Profile.

## Fehlerbilder

### `401 AUTH_REQUIRED`

Benutzer ist nicht angemeldet oder die Session ist abgelaufen. Neu anmelden und erneut testen.

### `AI_NOT_CONFIGURED`

`OPENAI_API_KEY` fehlt im Supabase-Projekt oder die Function wurde nach dem Setzen nicht neu deployt.

### `429` oder Rate Limit

OpenAI-Projektlimit beziehungsweise Nutzungstier erreicht. Usage und Limits in der API Platform prüfen. Luvia verwendet bis dahin den deterministischen Fallback.

### `AI_TIMEOUT`

Providerantwort dauerte zu lange. Erneut versuchen; gespeicherte Daten werden dadurch nicht verändert.

### Dashboard zeigt Fallback-Text

Health-Aufruf und Supabase Function Logs prüfen. Die App bleibt absichtlich nutzbar, auch wenn die AI-Verbindung ausfällt.
