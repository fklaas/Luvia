# Deployment Build 13.0.0
1. Im Projektstamm: `supabase db push`
2. Keine Edge-Function-Änderung; `luvia-gateway` muss für diesen Build nicht neu deployt werden.
3. Dateien committen und pushen.
4. Hosting-Build abwarten.
5. PWA aktualisieren oder Service Worker/Caches löschen.
6. `/intelligence/console.html#places` öffnen und Place-Diagnostik prüfen.

## Corrected migration package
If the earlier SQL execution failed with `column \"place_id\" does not exist`, the transaction was rolled back. Use this corrected package and run `supabase db push` again, or execute the corrected migration in the SQL Editor.
