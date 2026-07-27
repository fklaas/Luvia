# Deployment – Luvia v9.21.0 / Core V2.12.3.1

## 1. Supabase Edge Function
Vom Projektstamm aus:

```bash
supabase login
supabase link --project-ref <DEIN_PROJECT_REF>
supabase functions deploy luvia-gateway
```

Das Gateway verwendet weiterhin das bestehende Secret `GOOGLE_PLACES_API_KEY`. Es ist kein neues Secret erforderlich.

Optional prüfen:

```bash
supabase secrets list
supabase functions serve luvia-gateway --env-file supabase/.env.local
```

## 2. Datenbank
Für V2.12.3.1 ist keine neue SQL-Migration nötig. `canonicalCity` und `landmarkContext` sind Teil des bereits als JSON gespeicherten Destination Context und werden abwärtskompatibel normalisiert.

## 3. Web-App
Das vollständige Paket auf den produktiven Branch beziehungsweise Cloudflare Pages deployen. Build und Service-Worker-Cache wurden auf `9.21.0` erhöht.

## 4. Nach Deployment
Browser/PWA vollständig neu laden. Bei installierter PWA einmal schließen und erneut öffnen; der Service Worker löscht ältere `luvia-*`-Caches bei Aktivierung.
