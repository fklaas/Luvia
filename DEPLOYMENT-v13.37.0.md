# Deployment · Luvia 13.37.0 / Core 4.37.0

## 1. Supabase Migration zuerst
```bash
supabase db push
```

Neu:
`20260807190000_core_v4_37_0_memory_curation_foundation.sql`

Die Migration legt Stack-Curation und Titelvorschläge an, öffnet die Album-Review-Leseseite für Trip-Mitglieder und erstellt die Owner-only RPC zum Auflösen eines Stacks.

## 2. Frontend deployen
Kompletten Inhalt des Builds deployen.

## 3. PWA aktualisieren
`force-update.html` einmal öffnen. Danach Browser/PWA vollständig schließen und neu starten.

## 4. Pflichtprüfung
- 3-Foto-Auswahl testen.
- Stack-Datum gegen Galerie-/Media-Tag vergleichen.
- Titelvorschlag von zwei Accounts speichern/reloaden.
- gemeinsamen Review-Status mit zwei Accounts prüfen.
- Owner-only Auflösen testen und verifizieren, dass Fotos/Cards erhalten bleiben.
- Gallery ohne alte Memory-Moments-Sektion prüfen.

Keine neue Edge Function erforderlich.
