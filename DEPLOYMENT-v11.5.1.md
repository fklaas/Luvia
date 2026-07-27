# Deployment Luvia 11.5.1

1. Inhalt der vollständigen ZIP in das GitHub-Repository übernehmen.
2. Commit erstellen und auf den produktiven Branch pushen.
3. Cloudflare/GitHub-Deployment vollständig durchlaufen lassen.
4. Auf dem Testgerät installierte PWA vollständig schließen und neu öffnen.
5. Bei altem Cache einmal Browserdaten der Domain löschen oder die PWA neu installieren.
6. In der Developer Console Build `11.5.1` und Core `3.3.1` kontrollieren.

## Supabase

- Keine SQL-Migration erforderlich.
- Keine Edge Function neu zu deployen.
- Keine Secrets oder RLS-Policies geändert.
