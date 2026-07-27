# Luvia 11.6.2 · Core 3.4.2

## Live Collaboration Foundation

Dieser Release führt die gemeinsame Live-Schicht als zentrale Core-Grundlage ein. Aktivitätsdaten und Teilnehmerstatus liegen nicht im Dashboard selbst, sondern werden über wiederverwendbare Core-Services, sichere Supabase-RPCs und Realtime-Kanäle bereitgestellt.

### Neu
- Zentraler `LuviaCollaboration` Service für Activity Feed, Presence, Heartbeats und Realtime-Abonnements.
- Dauerhafte `trip_activity_events` für gemeinsame Ereignisse einer Reise.
- Dauerhafte `trip_presence` für geräteübergreifenden Online- und Zuletzt-aktiv-Status.
- Live-Dashboard-Widget **Letzte Aktivität**.
- Live-Dashboard-Widget **Gemeinsam live** mit Online-, Away- und Offline-Zuständen.
- Automatische Aktivität bei neuem Reisebeitritt.
- Automatische Aktivität bei Reiseänderungen und Restaurant-Aktualisierungen.
- Öffentliche Core-API `LuviaCollaboration.record(...)` für alle kommenden Module.
- Realtime-Refresh ohne Seitenneuladung.
- Gerätespezifische Presence, damit ein Nutzer mehrere Geräte parallel verwenden kann.
- Datenschutz: Aktivität und Presence sind ausschließlich für Mitglieder derselben Reise lesbar.

### Architektur
- UI-Widgets enthalten keine eigene Cloud- oder Realtime-Logik.
- Supabase ist die führende Quelle für Aktivität und Presence.
- Postgres Changes aktualisieren alle geöffneten Geräte unmittelbar.
- Presence wird alle 30 Sekunden erneuert; nach 90 Sekunden gilt ein Gerät nicht mehr als online.
- Zukünftige Module können Ereignisse über den Core publizieren, ohne eigene Tabellen oder Channels aufzubauen.

### Datenbank
Migration:
`supabase/migrations/20260727_013_core_v3_4_2_live_collaboration.sql`

### Deployment
Für diesen Release ist kein neues Deployment der Edge Function `luvia-gateway` erforderlich. Die neue SQL-Migration muss vor dem Testen ausgeführt werden.
