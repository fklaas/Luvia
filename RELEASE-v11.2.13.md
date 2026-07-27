# Luvia 11.2.13 · Core 3.0.2.13

## Schema-Agnostic Ownership & Authoritative Cloud Trips

- Besitzerprüfung funktioniert mit alten `trip_members`-Schemas ohne `role`-Spalte.
- Alleinige Mitglieder werden sicher als Ersteller/Besitzer behandelt und – soweit das Schema es unterstützt – serverseitig nachgetragen.
- Reiseanlage und Profiländerungen speichern wieder über denselben zentralen Cloud-Vertrag.
- Der Bearbeiten-Dialog zeigt Speicherfehler sichtbar an und bleibt nicht scheinbar funktionslos.
- Eine erfolgreich geladene Supabase-Reiseliste ist vollständig autoritativ. In der Datenbank gelöschte Reisen werden aus Cache und aktiver Auswahl entfernt.
- Local Storage bleibt nur bei einem echten Netzwerk- oder RPC-Ausfall als Offline-Fallback bestehen.
