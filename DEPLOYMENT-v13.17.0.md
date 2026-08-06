# Deployment – Luvia 13.17.0 / Core 4.17.0

## Voraussetzungen

- Supabase CLI ist installiert.
- Zugriff auf das Supabase-Projekt `yiadkcxgyzdgyadnhyqe` ist vorhanden.
- Ein OpenAI-API-Projekt mit aktivierter API-Abrechnung und einem geheimen API-Key ist vorhanden.
- Befehle werden im entpackten Hauptverzeichnis der vollständigen Luvia-ZIP ausgeführt.

## 1. Supabase anmelden und Projekt verbinden

```bash
supabase login
supabase link --project-ref yiadkcxgyzdgyadnhyqe
```

Kontrolle:

```bash
supabase status
```

## 2. Datenbankmigration anwenden

```bash
supabase db push
```

Zu applizierende neue Migration:

```text
supabase/migrations/20260803_038_core_v4_17_0_luvia_brain_foundation.sql
```

Die Migration ist idempotent und löscht keine bestehenden Profilpräferenzen.

## 3. OpenAI-Secrets setzen

Den geheimen Schlüssel ausschließlich im Terminal als Supabase Secret setzen. Nicht in JavaScript, GitHub, eine `.env` im veröffentlichten Frontend oder den Chat kopieren.

```bash
supabase secrets set OPENAI_API_KEY="DEIN_OPENAI_API_KEY"
supabase secrets set LUVIA_AI_MODEL_FAST="gpt-5.6-luna"
supabase secrets set LUVIA_AI_MODEL_DEFAULT="gpt-5.6-terra"
supabase secrets set LUVIA_AI_MODEL_DEEP="gpt-5.6-sol"
supabase secrets set LUVIA_ALLOWED_ORIGINS="https://myluvia.app,https://www.myluvia.app"
```

Kontrolle ohne Anzeige des geheimen Werts:

```bash
supabase secrets list
```

## 4. Edge Functions deployen

Beide Functions wurden in diesem Build verändert:

```bash
supabase functions deploy luvia-intelligence
supabase functions deploy luvia-gateway
```

## 5. Frontend veröffentlichen

```bash
git add .
git commit -m "feat(ai): establish Luvia Brain as central app intelligence"
git push
```

## 6. PWA aktualisieren

Neuer Cache:

```text
luvia-shell-v13.17.0
```

Danach:

1. Alle Luvia-Tabs schließen.
2. Installierte PWA vollständig beenden.
3. `force-update.html` öffnen.
4. Luvia neu starten.
5. In der Diagnose Build `13.17.0`, Core `4.17.0` und Cache `luvia-shell-v13.17.0` prüfen.

## 7. Live-Gesundheit prüfen

In einer angemeldeten Luvia-Sitzung in der Browserkonsole:

```javascript
await window.LuviaAI.health()
```

Erwartet werden unter anderem:

```text
configured: true
provider: openai
Luna  → fast
Terra → default
Sol   → deep
```

## 8. Live-Abnahme

- Dashboard-Briefing laden und aktualisieren.
- Places Guided Discovery abschließen und AI-Gründe/Unbekannte prüfen.
- Move Guided Discovery abschließen; keine Timeline-Aktion darf erscheinen.
- „Tag gemeinsam prüfen“ öffnen. Ein Vorschlag darf erst nach Bestätigung schreiben.
- Einen Vorschlag zuerst ablehnen und danach einen neuen bewusst bestätigen.
- `ai_usage_events`, `ai_learning_signals` und `ai_action_proposals` in Supabase prüfen.
- Mit zwei Benutzern kontrollieren, dass RLS fremde AI-Daten blockiert.

## Kein automatisches Live-Ergebnis in der gelieferten ZIP

Lokale Tests können den Code, die Contracts, die Migration, den Fallback und simulierte Laufzeit prüfen. Ein echter OpenAI-Aufruf und ein echtes Supabase-Deployment wurden ohne deinen API-Key beziehungsweise Produktionszugriff nicht ausgeführt und werden nicht als bestanden behauptet.
