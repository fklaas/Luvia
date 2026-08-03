# Luvia 13.12.0 / Core 4.12.0 — Trailforks Hybrid Cycling Discovery

## Ziel
Fahrradrouten nutzen eine belastbare Hybrid-Pipeline: genehmigte Trailforks-API für kuratierte MTB-Trails, openrouteservice für erzeugte Rundtouren, OpenStreetMap für freie Routen/Trailmerkmale und externe Deep Links für nicht integrierbare Anbieter.

## Architektur
- `cycling.search.trailforks`: serverseitiger Trailforks-Adapter; Secrets bleiben ausschließlich im Supabase Gateway.
- `cycling.search.generated`: openrouteservice-Rundtouren für MTB, Gravel, City, Familie und Touring.
- `cycling.search.routes` / `cycling.search.trails`: OSM-Ergänzung und Fallback.
- Alle Resultate werden in den kanonischen `cycling_route` Place normalisiert und verwenden globale Karten, Favoriten, Detailkarte, Timeline und Cloud-Persistenz.
- Partner ohne freigegebene API werden ausschließlich als klar gekennzeichnete externe Deep Links angeboten.

## Datenherkunft
Trailforks-Treffer sind als `Trailforks` gekennzeichnet und enthalten Attribution. Automatisch berechnete Runden sind als `Für euch erstellt` gekennzeichnet. Quellen werden nicht vermischt oder als kuratiert ausgegeben.
