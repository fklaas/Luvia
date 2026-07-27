Luvia v9.5.1 – Intelligence Core V2.2.1 Berechtigungsfix

1. ZIP in das GitHub-Repository übernehmen.
2. In Supabase den SQL Editor öffnen.
3. Diese Datei vollständig ausführen:
   supabase/migrations/20260726_002_core_v2_2_permissions.sql
4. Danach öffnen:
   /intelligence/test.html
5. Erst „Berechtigungen prüfen“, danach „CRUD-Test starten“.

Erwartetes Ergebnis:
- SELECT / INSERT / UPDATE / DELETE: Bereit
- Reisemitgliedschaft: Ja
- CRUD-Test: alle vier Schritte erfolgreich
- Sync Queue: 0
