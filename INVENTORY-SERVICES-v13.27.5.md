# Service-Inventar 13.27.5

| Service | Datei | Version | Abhängigkeiten | Diagnose | Test | Status | Risiko | Entscheidung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| storage | intelligence/services/base-services.js | '1.0.0-web-adapter' | environment | ja | ja | active | mittel | behalten |
| auth | intelligence/services/base-services.js | '3.3.0-central-supabase-client' | environment,storage | ja | ja | active | mittel | behalten |
| user | intelligence/services/base-services.js | '3.3.0-profile-derived' | auth | ja | ja | active | mittel | behalten |
| data | intelligence/services/base-services.js | window.LuviaData?.version\|\|'2.2' | auth,storage | ja | ja | active | mittel | behalten |
| trips | intelligence/services/base-services.js | '3.3.0-canonical-trip-store' | data,user | ja | ja | active | mittel | behalten |
| events | intelligence/services/base-services.js | window.LuviaKernelEvents?.version\|\|'2.4.4' | environment | ja | ja | active | mittel | behalten |
| platform | intelligence/services/base-services.js | window.LuviaPlatform?.version\|\|'2.9.0' | environment,events | ja | ja | active | mittel | behalten |
| pwa | intelligence/services/base-services.js | window.LuviaPWA?.version\|\|'3.0.2.3-diagnostics' | environment,storage,events,platform | ja | ja | active | mittel | behalten |
| destination | intelligence/services/base-services.js | window.LuviaDestination?.version\|\|'2.9.0' | data,trips,events | ja | ja | active | mittel | behalten |
| backend | intelligence/services/base-services.js | window.LuviaBackend?.version\|\|'2.10.0' | auth,environment,events,platform | ja | ja | active | mittel | behalten |
| places | intelligence/services/base-services.js | window.LuviaPlaces?.version\|\|'2.11.2' | backend,destination,events | ja | ja | active | mittel | behalten |
| place-registry | intelligence/services/base-services.js | window.LuviaPlaceRegistry?.version\|\|'4.27.2' | events | ja | ja | active | mittel | behalten |
| place-intelligence | intelligence/services/base-services.js | window.LuviaPlaceCore?.version\|\|'4.27.2' | place-registry,places,trips,events | ja | ja | active | mittel | behalten |
| timeline | intelligence/services/base-services.js | window.LuviaTimelineCore?.version\|\|'4.3.0' | data,trips,events,place-intelligence | ja | ja | active | mittel | behalten |
| presence-visit | intelligence/services/base-services.js | window.LuviaPresenceVisitCore?.version\|\|'4.3.0' | platform,trips,events,place-intelligence,timeline | ja | ja | active | mittel | behalten |
| recommendations | intelligence/services/base-services.js | window.LuviaRecommendations?.version\|\|'3.9.3' | backend,places,place-intelligence,trips,events | ja | ja | active | mittel | behalten |
| restaurants | intelligence/services/base-services.js | window.LuviaRestaurants?.version\|\|window.LuviaRestaurantService?.version\|\|'3.9.3' | places,trips,events | ja | ja | active | mittel | behalten |
| schedule-intelligence | intelligence/services/base-services.js | window.LuviaScheduleIntelligence?.version\|\|'3.9.3' | trips,events,recommendations | ja | ja | active | mittel | behalten |
| restaurant-intelligence | intelligence/services/base-services.js | window.LuviaRestaurantIntelligence?.version\|\|'3.9.3' | recommendations,places,trips,events,schedule-intelligence | ja | ja | active | mittel | behalten |
| cross-module-recommendations | intelligence/services/base-services.js | window.LuviaCrossModuleRecommendations?.version\|\|'4.1.3.12' | recommendations,place-intelligence,schedule-intelligence,restaurant-intelligence,events | ja | ja | active | mittel | behalten |
| today-intelligence | intelligence/services/base-services.js | window.LuviaTodayIntelligence?.version\|\|'4.3.0' | schedule-intelligence,place-intelligence,timeline,presence-visit,cross-module-recommendations,trips,events | ja | ja | active | mittel | behalten |
| live-day-companion | intelligence/services/base-services.js | window.LuviaLiveDayCompanion?.version\|\|'4.1.3.12' | today-intelligence,presence-visit,timeline,schedule-intelligence,events | ja | ja | active | mittel | behalten |
| core4-diagnostics | intelligence/services/base-services.js | window.LuviaCore4Diagnostics?.version\|\|'4.1.3.12' | place-intelligence,schedule-intelligence,timeline,presence-visit,cross-module-recommendations,events | ja | ja | active | mittel | behalten |
| media-readiness | intelligence/services/base-services.js | window.LuviaMediaReadiness?.version\|\|'4.27.5' | storage,data,trips,place-intelligence,timeline,events | ja | ja | active | niedrig | neu, read-only |
| developer | intelligence/services/base-services.js | '3.3.0' | environment,data,trips,events,platform,pwa,backend,places | ja | ja | active | mittel | behalten |

## Bewertung

Die Registry markiert einen Service nach erfolgreichem `init/start` grundsätzlich als `ready`. Einige Tests prüfen nur API-Formen oder leere Zustände. Deshalb ist `ready` nicht automatisch gleichbedeutend mit produktivem Backendzugriff. Der neue `media-readiness`-Service trennt statische Bereitschaft und optionale Live-Probes.
