# Deployment – Luvia 13.3.1

## Reihenfolge

### 1. SQL-Migration

Verzeichnis: Projektwurzel, also der Ordner, der `supabase/` enthält.

```bash
supabase db push
```

Alternativ die Datei `supabase/migrations/20260729_028_core_v4_3_1_stay_foundation.sql` im Supabase SQL Editor ausführen.

Erfolg: Tabelle `public.accommodations` und RPC `public.luvia_upsert_accommodation` sind vorhanden; die Migration endet ohne Fehler.

### 2. Edge Function

Verzeichnis: Projektwurzel.

```bash
supabase functions deploy luvia-gateway
```

Erfolg: Supabase meldet ein erfolgreiches Deployment. `system.health` liefert Gateway-Version `4.3.1`.

### 3. Secrets

Keine neuen Secrets erforderlich. Die vorhandenen Google-Places- und Supabase-Secrets bleiben unverändert.

### 4. Frontend

Die vollständige Projektversion veröffentlichen beziehungsweise committen und den GitHub-Pages-/Cloudflare-Build abwarten.

### 5. PWA-Cache

Service-Worker-Cache: `luvia-shell-v13.3.1`.

### 6. Neustart

Browser-Tab beziehungsweise installierte PWA vollständig schließen und neu öffnen. Bei alter Oberfläche Website-Daten/PWA-Cache einmal löschen.
