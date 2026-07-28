# Luvia 12.1.1 · Core 3.9.1

## Schedule Intelligence Diagnostics Stability

- Korrigiert die ungültige Service-Abhängigkeit `restaurants`.
- Schedule Intelligence hängt jetzt von den tatsächlich registrierten Core-Services ab.
- Restaurant Intelligence startet erst nach Schedule Intelligence.
- Die klassische Core-Diagnose lädt nun Recommendation-, Restaurant- und Schedule-Runtime vollständig.
- Beide Diagnoseseiten bleiben bei korrekt geladenem Build nicht mehr leer.
- Runtime-, Cache- und sichtbare Versionsangaben wurden auf 12.1.1 / Core 3.9.1 aktualisiert.

Keine SQL-Migration und kein Edge-Function-Deployment erforderlich.
