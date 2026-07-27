LUVIA v9.6 – INTELLIGENCE CORE V2.3
ENVIRONMENT & URL FOUNDATION

Neu:
- zentrale Laufzeitumgebung unter intelligence/environment.js
- automatische Erkennung von localhost, GitHub Pages, staging.myluvia.app, myluvia.app, PWA und Native
- korrekter Base Path für GitHub Pages (/Luvia/)
- zentrale URL-Helfer für App, Assets, Auth-Redirects und zukünftige Universal Links
- Auth-Konfiguration nutzt die zentrale Redirect-URL
- Intelligence Core stellt die Environment API bereit
- Diagnose zeigt Umgebung, Base URL, PWA-/Native-Status und Auth-Redirect
- automatische Erreichbarkeitsprüfung der wichtigsten App-Dateien

Test:
1. Paket in das Repository übernehmen.
2. GitHub Pages abwarten und die Diagnose mit Strg+F5 neu laden.
3. https://fklaas.github.io/Luvia/intelligence/test.html öffnen.
4. Unter „Environment & URL Foundation“ auf „Wichtige Pfade prüfen“ klicken.
5. App, Diagnose, Core, Data Layer und Auth-Konfiguration müssen „Erreichbar“ anzeigen.
6. Berechtigungsprüfung und CRUD-Test nochmals ausführen; beide müssen weiterhin grün bleiben.

Keine neue Supabase-SQL-Migration erforderlich.

Die Domain myluvia.app wird noch NICHT umgestellt. Dieser Schritt schafft nur die sichere Grundlage dafür.
