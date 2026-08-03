# Luvia 13.17.0 / Core 4.17.0

## Luvia Brain Foundation

Build 13.17.0 führt das zentrale, appweite Luvia-Gehirn ein. OpenAI ist der erste Modellprovider, aber kein Modul ist direkt an OpenAI gekoppelt. Dashboard, Places, Move, Timeline, Profil, Empfehlungen und alle zukünftigen Bereiche verwenden die gemeinsame `LuviaAI`-Fassade, einen kontrollierten Context Engine, feste Capability- und Output-Verträge sowie den vorhandenen Luvia Core.

## Was neu ist

### Zentraler AI Core

Neu unter `core/ai/`:

- Capability Registry
- Model Router
- Context Engine
- Tool Registry
- Policy Service
- Structured Output Validator
- OpenAI Provider
- Learning Memory Service
- bestätigungspflichtiger Command Proposal Service
- Dashboard Brain Service
- zentrale `LuviaAI`-Fassade

Kein Modul darf OpenAI oder `luvia-intelligence` direkt ansprechen.

### Serverautoritatives Modellrouting

Der Browser übermittelt nur die interne Stufe:

```text
fast    → Luna
standard→ Terra
deep    → Sol
```

Die tatsächliche Zuordnung liegt ausschließlich in Supabase Secrets beziehungsweise in der Edge Function:

```text
LUVIA_AI_MODEL_FAST    = gpt-5.6-luna
LUVIA_AI_MODEL_DEFAULT = gpt-5.6-terra
LUVIA_AI_MODEL_DEEP    = gpt-5.6-sol
```

### Globaler Context Engine

Jede Capability erhält nur den dafür erforderlichen Kontext. Getrennt bleiben:

- ausdrücklich bestätigte globale Profilpräferenzen,
- die temporäre Auswahl im aktuellen Modul,
- belegte Lernsignale,
- Reise-, Tages-, Timeline- und Provider-Evidence.

Kontakt-, Token-, Zahlungs- und Buchungsfelder werden vor einem AI-Aufruf entfernt.

### Sichere Schreibgrenze

Die KI darf lesen, bewerten und Entwürfe erstellen. Schreibende Timeline-Vorschläge werden in `ai_action_proposals` als Draft gespeichert, sichtbar erklärt und erst nach Bestätigung über bestehende Luvia-Core-Kommandos ausgeführt.

### Lernsignale ohne heimliche Profiländerung

Neue Entscheidungen wie Favorisieren, Ablehnen oder Übernehmen können als belegte Lernsignale in `ai_learning_signals` zusammengeführt werden. Diese Signale verändern `public.user_profiles` nicht automatisch. Im Profilbereich **Vorlieben** erscheinen offene, belegte Lernsignale mit Konfidenz und Beleganzahl. Erst **In Reisekompass übernehmen** schreibt die Vorliebe über den bestehenden `LuviaUserPreferences`-Core in `user_profiles`; **Nicht relevant** verwirft das Signal. Damit bleibt die Grenze zwischen Beobachtung und bewusster Profilentscheidung sichtbar und technisch erzwungen.

### Places und Move

Guided Discovery verwendet jetzt zwei AI-Stufen:

1. `discovery.plan` ergänzt den harten Contract um kontrollierte Suchstrategien.
2. `discovery.rank` gewichtet nur Kandidaten neu, die vorher bereits Typ-, Ziel-, Ausschluss- und Qualitätsprüfung bestanden haben.

Die KI kann dadurch Stimmung, Reiseanlass, globale Vorlieben, aktuellen Reisemoment und Lernsignale berücksichtigen, ohne falsche Providerergebnisse in die Liste zurückzuholen.

Move bleibt vollständig ohne Timeline, `planned_at` und Planning-Capability.

### Dashboard

Das Dashboard erhält ein persönliches AI-Briefing mit Reise-, Tages- und Planungskontext. Der Benutzer kann Luvia direkt ansprechen oder einen bestätigungspflichtigen Vorschlag zur Tagesplanung anfordern.

### Deterministischer Fallback

Fehlender API-Key, Timeout, Rate Limit oder Providerfehler blockieren die App nicht. Jede Capability besitzt einen regelbasierten Fallback. Cloud-Daten und bestehende Planungen bleiben unverändert.

## Datenbank

Neue idempotente Migration:

```text
supabase/migrations/20260803_038_core_v4_17_0_luvia_brain_foundation.sql
```

Neue Tabellen:

- `ai_learning_signals`
- `ai_interaction_events`
- `ai_action_proposals`
- `ai_usage_events`

Alle benutzerbezogenen Tabellen verwenden RLS mit `auth.uid() = user_id`. Telemetrie enthält keine Prompts oder vollständigen privaten Kontexte.

## Edge Functions

Geändert:

- `luvia-intelligence` – vollständiger Luvia-Brain-Orchestrator
- `luvia-gateway` – Versions-/Health-Metadaten auf 13.17.0 / 4.17.0

## PWA

```text
luvia-shell-v13.17.0
```

## Ehrliche Grenze dieses Builds

Dieser Build legt das zentrale Gehirn und die ersten appweiten Capabilities an. Er ersetzt nicht in einem Schritt sämtliche zukünftige Fachlogik. Neue Module werden ab jetzt über dieselbe Capability-/Tool-Struktur angeschlossen. Echte OpenAI- und Supabase-Live-Aufrufe benötigen die Einrichtung und das Deployment aus `LUVIA-AI-SETUP-v13.17.0.md`.
