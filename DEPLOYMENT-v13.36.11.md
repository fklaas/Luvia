# Deployment — Luvia 13.36.11 / Core 4.36.11

## Voraussetzung
Die Migration aus 13.36.10 muss bereits deployed sein:
`supabase/migrations/20260807161000_core_v4_36_10_profile_persistence_memory_review.sql`

## Für 13.36.11
- Keine neue Supabase-Migration.
- Keine neue Edge Function.
- Vollständiges Frontend deployen.
- Danach einmal `force-update.html` öffnen.
- PWA/Browser vollständig schließen und neu öffnen.
- Versionsanzeige auf 13.36.11 / Core 4.36.11 kontrollieren.

## Pflicht-Smoke-Tests
- Mobile Swipe rechts/links inkl. Overlay und Abschlusszustand.
- Desktop Albumaktionen.
- Mehrere Desktop-Rerolls auf Laptop und großem Monitor.
