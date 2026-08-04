# Deployment 13.19.1

## Voraussetzung
Die Datenbank-Baseline muss in `supabase migration list --linked` lokal und remote denselben 14-stelligen Zeitstempel zeigen.

## Migrationen
Build 13.19.1 ergänzt:

`20260803213000_core_v4_18_0_journey_knowledge_graph_universal_ai_orchestrator.sql`

Falls Migration 038 aus 13.17.0 noch nicht angewendet wurde, muss sie vor 13.19.1 mit einem eigenen eindeutigen 14-stelligen Timestamp in den aktiven Migrationsordner aufgenommen werden.

```powershell
supabase db push --dry-run
supabase db push
```

## Secrets
```powershell
supabase secrets set OPENAI_API_KEY="DEIN_OPENAI_API_KEY"
supabase secrets set LUVIA_AI_MODEL_FAST="gpt-5-mini"
supabase secrets set LUVIA_AI_MODEL_DEFAULT="gpt-5"
supabase secrets set LUVIA_AI_MODEL_DEEP="gpt-5-pro"
supabase secrets set LUVIA_ALLOWED_ORIGINS="https://myluvia.app,https://www.myluvia.app"
```

## Functions
```powershell
supabase functions deploy luvia-intelligence
supabase functions deploy luvia-gateway
```

## Git
```powershell
git add .
git commit -m "feat(ai): add journey knowledge graph and universal orchestrator"
git push
```

## PWA
Cache: `luvia-shell-v13.19.1`. Danach Tabs schließen, PWA beenden, `force-update.html` öffnen und App neu starten.
