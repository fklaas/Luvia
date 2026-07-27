LUVIA 4.2 – STRICT MODULE VISIBILITY

Korrektur:
- Eigene modulare Reisen zeigen ohne Modulauswahl ausschließlich das Dashboard.
- Countdown, Live Moments, Budget, Fotospots, Erinnerungen, Revue, Reisebuch und Schlusssatz sind nicht mehr als sichtbare Standardblöcke vorhanden.
- Dasselbe gilt für alle weiteren optionalen Module.
- Eine leere selectedModules-Liste wird strikt als „kein Modul“ behandelt.
- Beim Wechsel zwischen Reisen werden alte Modul-Schalter vollständig entfernt.
- Kritische Sichtbarkeitsregeln befinden sich direkt in trip.html und greifen bereits vor dem Laden der übrigen JavaScript-Dateien.
- Service-Worker-Cache wurde erneuert.
- paris-official.html blieb unverändert.
