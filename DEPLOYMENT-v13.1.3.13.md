# Deployment · Build 13.1.3.13

## 1. Supabase-Migration

Im Projektstamm:

```bash
supabase db push
```

Ohne Terminal: Inhalt von `supabase/migrations/20260728_026_core_v4_1_3_13_cloud_only_schedule.sql` im Supabase SQL Editor ausführen.

Die Migration bereinigt vorhandene doppelte Schedule-Zeilen, ergänzt kanonische Unique-Indizes, aktiviert Realtime und führt eine Revision pro Änderung ein.

## 2. Edge Functions

Kein neues Edge-Function-Deployment erforderlich.

## 3. Frontend

```bash
git add .
git commit -m "fix(core): make schedule and today data cloud authoritative"
git push
```

Anschließend Hosting-Build abwarten und das PWA-Update installieren.
