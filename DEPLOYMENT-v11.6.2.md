# Deployment · Luvia 11.6.2 / Core 3.4.2

## 1. Projektordner öffnen
Im Terminal in den entpackten Luvia-Projektordner wechseln. Der Ordner muss `supabase/config.toml` enthalten.

## 2. Supabase-Projekt verknüpfen
Nur falls noch nicht geschehen:

```bash
supabase login
supabase link --project-ref DEINE_PROJECT_REF
```

## 3. Migration ausführen

```bash
supabase db push
```

Dabei wird folgende Migration angewendet:

```text
20260727_013_core_v3_4_2_live_collaboration.sql
```

Alternativ kann der vollständige Inhalt dieser Datei einmalig im Supabase SQL Editor ausgeführt werden.

## 4. App deployen
Alle Projektdateien zu GitHub committen und das bestehende Pages-/Cloudflare-Deployment ausführen.

## 5. Edge Function
`luvia-gateway` muss für 11.6.2 nicht neu deployed werden.

## 6. Cache
Nach erfolgreichem Deployment die App einmal vollständig schließen und neu öffnen. Der Service-Worker verwendet den Cache `luvia-shell-v11.6.2`.
