# Luvia v9.22.8 · Core V2.12.4.8

## Core Access & Diagnostics Repair

### Behoben
- Root-URLs `backend.html`, `console.html` und `core.html` funktionieren wieder auf GitHub Pages.
- Die Root-Seiten leiten stabil in den bestehenden Ordner `intelligence/` weiter und erhalten Query-Parameter sowie Hashes.
- Backend, Developer Console und Core-Diagnose zeigen nicht mehr die veralteten Stände Core V2.12.3 / Build 9.20.0 bzw. Core V2.5.2.
- Die sichtbare Versionsanzeige wird auf Backend und Console aus `intelligence/kernel/version.js` synchronisiert.
- Navigation zwischen Backend, Console, Core-Diagnose und App wurde vervollständigt.
- Aktive Runtime-, PWA- und Cache-Metadaten wurden auf Build 9.22.8 / Core 2.12.4.8 angehoben.

### Architekturprüfung
Die Dateien `core.js`, `intelligence/core.js` und `sync/core.js` sind keine drei Kopien derselben Core-Implementierung:
- `/core.js`: Supabase-Konfiguration / historischer Kompatibilitätseinstieg.
- `/intelligence/core.js`: Intelligence-Fassade für Destination, Backend und Places.
- `/sync/core.js`: Synchronisations-Laufzeit für Reise- und Benutzerdaten.

Sie wurden deshalb nicht blind zusammengeführt. Eine Umbenennung ist ein eigener Migrationsschritt, weil bestehende Seiten und Module diese Pfade direkt laden.

### Direkte URLs
- `/Luvia/backend.html`
- `/Luvia/console.html`
- `/Luvia/core.html`

### Commit-Titel
`fix(core): restore root diagnostics routes and synchronize runtime versions`
