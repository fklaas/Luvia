# Deployment — Luvia 13.37.2 / Core 4.37.2

## Supabase
Keine neue Migration in 13.37.2.

Voraussetzung: Die Migration aus 13.37.1 muss bereits deployed sein:
`supabase/migrations/20260807201500_core_v4_37_1_memory_voting_entry.sql`

Falls noch nicht geschehen:
```bash
supabase db push
```

## Frontend
Anschließend die vollständige 13.37.2-Version deployen.

## Cache / PWA
Einmal `force-update.html` öffnen. Danach Browser/PWA vollständig schließen und neu starten.

## Edge Functions
Keine neue Edge Function erforderlich.
