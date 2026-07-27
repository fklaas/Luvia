# Testplan Luvia 10.1.0

- Cache/Service Worker aktualisiert sich auf `luvia-shell-v10.1.0`.
- Ohne Reise erscheint kein Loop, sondern der Luvia Entry Empty State.
- „Erste Reise erstellen“ öffnet `LuviaTripCreator`.
- „Meine Reisen → Neue Reise“ öffnet denselben Creator.
- Name und Ziel sind Pflichtfelder.
- Symbol-, Farb- und Datumswerte landen im aktiven kanonischen Trip.
- Supabase-Reise wird mit Einladungscode erstellt.
- Nach Erstellung lädt die App mit der neuen aktiven Reise.
