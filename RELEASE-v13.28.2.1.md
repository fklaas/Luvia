# Release 13.28.2.2 / Core 4.28.2.2

Korrektur der PostgREST-Berechtigungen für `media_memory_proposals`.

## Ursache
Die Tabelle und RLS-Policies waren vorhanden, aber `authenticated` besaß keine Tabellenprivilegien. PostgreSQL blockierte den Request daher vor der RLS-Auswertung mit `42501 permission denied`.

## Änderung
- `SELECT`, `INSERT` und `UPDATE` für `authenticated`
- kein Zugriff für `anon`
- verständliche Frontend-Meldung, falls die Migration noch fehlt
