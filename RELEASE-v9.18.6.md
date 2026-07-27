# Luvia v9.18.6

## Core V2.11.2 – Destination Intelligence Frontend Fix

### Behoben

- Der Places-Diagnosekontext übernimmt jetzt das vollständige Destination-Profil.
- Zeitzone und Zeitzonenname werden im Backend-Dashboard angezeigt.
- Sprache, Währung, Locale und Flagge werden nicht mehr beim Übergang vom Destination Service zum Places Service verworfen.
- `radiusSource`, Fehlerstatus und Auflösungszeitpunkt werden ebenfalls weitergereicht.
- PWA- und Asset-Cache wurden auf Build 9.18.6 angehoben.

### Ursache

Der Supabase Gateway lieferte die Destination-Intelligence-Daten korrekt. `places-service.js` reduzierte das Ziel jedoch auf Basisfelder, während das Backend-Dashboard ausschließlich den Places-Diagnosekontext verwendete.

### Deployment

Nur GitHub/Cloudflare muss neu bereitgestellt werden. Ein erneuter Supabase-Deploy ist für diesen Frontend-Fix nicht erforderlich.
