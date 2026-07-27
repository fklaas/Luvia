LUVIA 9.5 – INTELLIGENCE CORE V2.2 PERSISTENT DATA LAYER

Neu:
- Einheitliche Core-API für list/get/create/update/remove/upsert
- Automatische Trip- und Nutzerzuordnung
- Supabase als primäre Datenquelle
- lokaler Cache als Offline-Fallback
- Synchronisationswarteschlange für Offline-Schreibvorgänge
- automatischer Retry sobald das Gerät wieder online ist
- Fehlerprotokoll und Diagnosesnapshot
- CRUD-Test unter intelligence/test.html

Es ist keine zusätzliche SQL-Migration erforderlich. Die Migration aus V2.1 bleibt die Datenbankgrundlage.
