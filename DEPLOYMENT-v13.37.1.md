# Deployment — Luvia 13.37.1 / Core 4.37.1

## 1. Supabase zuerst
Dieser Build enthält eine neue Migration:

`supabase/migrations/20260807201500_core_v4_37_1_memory_voting_entry.sql`

Aus dem Projektordner:

```bash
supabase db push
```

## 2. Frontend deployen
Anschließend vollständige 13.37.1-Version deployen.

## 3. Cache/PWA
Einmal `force-update.html` öffnen, danach Browser/PWA vollständig schließen und neu starten.

## Edge Functions
Keine neue Edge Function erforderlich.
