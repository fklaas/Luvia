# Luvia v9.15.0 — Intelligence Core v2.8.0 Platform Layer Foundation

## Neu
- Zentrale `LuviaPlatform`-API mit stabilem Web-Adapter.
- Einheitliche Services für Environment, Device, Storage, Network, Lifecycle, Navigation, Clipboard, Sharing, Location, Permissions, Notifications und Files.
- Standardisierte `LuviaPlatformError`-Fehler mit maschinenlesbaren Codes.
- Capability-basierte Erkennung statt reiner User-Agent-Abhängigkeit.
- Async Storage API als Grundlage für spätere native Preferences/SQLite-Adapter.
- Einheitliche Online-/Offline-Events und Lifecycle-Abstraktion.
- Sichere externe Navigation und Maps-Öffnung.
- Share- und Clipboard-Fallbacks.
- Standort- und Berechtigungsfehler werden normalisiert.
- Dateiauswahl über eine zentrale API.
- Platform-Diagnostics und erweiterter Selbsttest in der Developer Console.

## Kompatibilität
- Bestehende öffentliche Platform-Funktionen bleiben erhalten.
- Web, PWA, Login, Reisen, App Shell und bestehende Module bleiben kompatibel.
- Bestehende Module müssen noch nicht vollständig migriert werden; neue Core-Komponenten können ab sofort ausschließlich die Platform Layer nutzen.

## Version
- Intelligence Core: 2.8.0
- App Build: 9.15.0
- PWA Cache: luvia-shell-v9.15.0
