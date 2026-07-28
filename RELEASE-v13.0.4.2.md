# Luvia Core 4.0.4.2 – Diagnostics Performance Hotfix

Build 13.0.4.2 stabilisiert Developer Console und Core-Diagnose. Diagnosebereiche werden nur noch beim Öffnen des jeweiligen Tabs gerendert. Große Traces, Arrays und Browser-Speicherdaten werden begrenzt und zusammengefasst. Kernel- und Datenbankprüfungen besitzen Timeouts, damit ein nicht antwortender Dienst die Seite nicht mehr blockiert.

## Behoben
- Developer Console blockiert den Browser nicht mehr beim Start.
- Core-4-Health wird nur bei aktivem Tab aufgebaut.
- Place-, Recommendation-, Event-, Log- und Rohdatenansichten werden nicht mehr gleichzeitig gerendert.
- JSON-Ausgaben sind gegen Zyklen, übergroße Arrays und extrem große Datenmengen abgesichert.
- Local-Storage-Audit liest maximal 150 Luvia-Schlüssel und parst nur relevante, kleine Diagnoseeinträge.
- Recommendation Trace ist auf kompakte Kandidaten- und Slot-Zusammenfassungen begrenzt.
- Diagnose- und Datenbank-Wartezeiten sind auf kontrollierte Timeouts begrenzt.
