LUVIA 9.12.0 – CORE V2.5.2 – MYLUVIA.APP DEPLOYMENT
=====================================================

Enthalten:
- CNAME-Datei für myluvia.app
- automatische Root-Pfade auf myluvia.app (kein /Luvia/)
- Produktions-, Staging- und GitHub-Pages-Erkennung
- Domain-Deployment-Test in der Developer Console
- Runtime-Konfiguration ohne fest codierte GitHub-Pages-Pfade
- isolierter Event-Bus-Selbsttest: Testfehler verändern keine Produktionsstatistik mehr
- Service-Worker-Cache v9.12.0

NACH DEM UPLOAD INS REPOSITORY
1. GitHub: Repository Luvia > Settings > Pages.
2. Custom domain: myluvia.app eintragen und speichern.
3. Beim Domainanbieter für @ vier A-Records anlegen:
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
4. Zusätzlich CNAME für www auf fklaas.github.io setzen (ohne /Luvia).
5. Keine Wildcard-DNS-Einträge verwenden.
6. Nach erfolgreicher Zertifikatsausstellung „Enforce HTTPS“ aktivieren.
7. Supabase > Authentication > URL Configuration:
   Site URL: https://myluvia.app
   Redirect URLs ergänzen:
   https://myluvia.app/**
   https://www.myluvia.app/**
   https://fklaas.github.io/Luvia/** (vorerst als Fallback)
8. Developer Console öffnen:
   https://myluvia.app/intelligence/console.html
9. Deployment > „Domain-Deployment testen“ ausführen.

Hinweis: DNS und GitHub-Einstellungen können nicht durch die ZIP selbst geändert werden.
