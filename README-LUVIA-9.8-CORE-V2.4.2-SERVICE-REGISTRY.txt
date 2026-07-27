LUVIA v9.8 – INTELLIGENCE CORE V2.4.2 SERVICE REGISTRY

Neu:
- zentrale LuviaServiceRegistry
- einheitlicher Lifecycle: init, start, stop, destroy, status, diagnostics, test
- automatische Abhängigkeitsauflösung und Startreihenfolge
- Service-Zustände und Laufzeitmetriken
- Basis-Services: Environment, Storage, Auth, User, Data, Trips, Developer
- eigene Testansicht für jeden Service in intelligence/test.html
- gemeinsamer Test aller Services

Installation:
1. Inhalt vollständig in das Repository übernehmen.
2. Keine neue SQL-Migration erforderlich.
3. GitHub Pages Deployment abwarten.
4. /intelligence/test.html mit Strg+F5 öffnen.
5. Kernel-Selbsttest und anschließend „Alle Services testen“ ausführen.
