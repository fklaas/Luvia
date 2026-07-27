LUVIA 9.5.2 – INTELLIGENCE CORE V2.2.2 DIAGNOSTICS CLEANUP

Diese Version korrigiert ausschließlich die fehlerhafte Berechtigungsdiagnose.

Änderungen:
- keine Abfrage geschützter PostgreSQL-Systeminformationen mehr
- Berechtigungsprüfung über echte, harmlose CRUD-Testoperationen
- garantiertes Aufräumen des Testdatensatzes
- klare Unterscheidung zwischen Anmeldung, Netzwerk, Tabellenrecht und RLS
- keine neue SQL-Migration erforderlich

Test:
1. intelligence/test.html öffnen
2. „Berechtigungen prüfen“ anklicken
3. SELECT, INSERT, UPDATE, DELETE und Reisemitgliedschaft müssen grün sein
4. anschließend CRUD-Test erneut ausführen
