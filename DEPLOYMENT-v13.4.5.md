# Deployment 13.4.5

1. SQL-Migrationen: nicht erforderlich.
2. Edge Function aus dem Projektordner deployen: `supabase functions deploy luvia-gateway`.
3. Neue Secrets: nicht erforderlich.
4. Frontend committen und pushen.
5. PWA-Cache: `luvia-shell-v13.4.5`.
6. Browser/PWA vollständig schließen und neu öffnen.

Erfolgskontrolle:
- Gateway-Preflight enthält `Access-Control-Allow-Origin: https://myluvia.app`.
- Restaurant-Planeintrag verschwindet unmittelbar nach bestätigter DB-Löschung.
- Timeline-Diagnose meldet `hydrated: true`.
- Tabwechsel erzeugt kein Modul-Intro und keinen Remount.
