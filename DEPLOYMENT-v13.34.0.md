# Deployment 13.34.0

1. Vollständiges Frontend deployen.
2. Die geänderte Supabase Function aus dem Projektroot deployen:
   `supabase functions deploy luvia-intelligence`
3. Keine SQL-Migration erforderlich.
4. `force-update.html` öffnen und anschließend die App neu starten.
5. Erwartete Version: `13.34.0 · Core 4.34.0`.

Die neue `memory.compose` Capability existiert erst nach dem Edge-Function-Deployment. Ohne Deployment nutzt die UI nur den belegten lokalen Fallback.
