# Deployment · Luvia 11.2.13

1. Im Supabase SQL Editor `supabase/migrations/20260727_009_core_v3_0_2_13_schema_agnostic_ownership.sql` vollständig ausführen.
2. Das vollständige Projekt in das GitHub-Repository übernehmen und pushen.
3. Cloudflare Pages abwarten.
4. Für übereinstimmende Gateway-Diagnoseversion anschließend optional `supabase functions deploy luvia-gateway --project-ref yiadkcxgyzdgyadnhyqe` ausführen. Die fachliche Gateway-Logik wurde nicht verändert.
5. App vollständig schließen und neu öffnen.

Keine Tabellen müssen manuell bearbeitet werden.
