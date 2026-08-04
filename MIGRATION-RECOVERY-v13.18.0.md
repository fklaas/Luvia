# Migrationswiederherstellung für das bestehende Luvia-Projekt

1. Die durch `supabase db pull` erzeugte Baseline-Datei muss größer als 0 Byte sein.
2. Baseline als angewendet markieren:
   `supabase migration repair <BASELINE_TIMESTAMP> --status applied --linked`
3. Mit `supabase migration list --linked` prüfen, dass Baseline lokal und remote identisch ist.
4. Die noch nicht ausgeführten Produktmigrationen mit eindeutigen 14-stelligen Dateinamen in `supabase/migrations` legen, in dieser Reihenfolge:
   - Preference Persistence aus 13.16.1, falls noch nicht live
   - Luvia Brain Foundation aus 13.17.0, falls noch nicht live
   - `20260803213000_core_v4_18_0_journey_knowledge_graph_universal_ai_orchestrator.sql`
5. `supabase db push --dry-run` ausführen. Es dürfen ausschließlich diese tatsächlich offenen Migrationen erscheinen.
6. Erst danach `supabase db push` ausführen.

Keine vorhandenen Policies oder Tabellen löschen, um die Historie künstlich passend zu machen.
