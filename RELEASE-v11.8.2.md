# Luvia 11.8.2 · Core 3.6.2 — Recommendation Runtime Recovery

- Recommendation API wird in App und Developer Console zuverlässig initialisiert.
- Der Service kann seine Runtime-Dateien bei fehlender oder veralteter Cache-Auslieferung kontrolliert nachladen.
- Der Restaurant-Adapter wird geprüft und bei Bedarf nachregistriert.
- Diagnose und Selbsttest greifen nicht mehr ungeschützt auf eine fehlende API zu.
- Die Service Registry ist alleinige Eigentümerin der Service-Registrierung; doppelte oder zeitabhängige Registrierung wurde entfernt.
