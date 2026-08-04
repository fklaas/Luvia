# Event- und Request-Audit 13.27.5

| Event | Auslöser | Listener | Loop-Risiko | Zielentscheidung |
| --- | --- | --- | --- | --- |
| activate | extern/Browser | sw.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| appinstalled | extern/Browser | intelligence/pwa-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| beforeinstallprompt | extern/Browser | intelligence/pwa-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| blur | extern/Browser | budget.js, day-closure.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| cancel | extern/Browser | people-system.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| controllerchange | extern/Browser | intelligence/pwa-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| fetch | extern/Browser | sw.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| focus | extern/Browser | budget.js, day-closure.js, gallery.js | mittel | prüfen/autoritativen Refresh beibehalten |
| focusin | extern/Browser | core/places/timeline-core.js, modules/restaurants-v2/restaurant-module.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| install | extern/Browser | sw.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:accommodation-updated | intelligence/place-entity-service.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:ai-changed | core/ai/ai-core.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:ai-memory-changed | core/ai/ai-memory-service.js | core/profiles/profile-foundation.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:ai-proposal-changed | core/ai/ai-command-proposal-service.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:ai-ready | core/ai/ai-core.js | core/ai/ai-memory-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:app-state-changed | luvia-app-state.js | legacy/ui/luvia-app-shell.js, luvia-app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:auth-changed | extern/Browser | core/ai/ai-memory-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:boot-phase | core/runtime/boot-coordinator.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:collaboration-changed | core/collaboration/collaboration-service.js | modules/restaurants-v2/restaurant-module.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:cross-module-recommendations-changed | core/recommendations/cross-module-recommendation-service.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:dashboard-changed | profile-center.js | legacy/ui/luvia-app-shell.js, luvia-app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:dashboard-widget-refresh | core/ai/ai-dashboard-service.js, core/places/place-lifecycle-service.js, core/places/places-final-foundation.js | app/app-shell.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:data-layer | intelligence/data-layer.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:data-ready | intelligence/data-layer.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:destination | intelligence/destination-service.js | modules/restaurants-v2/restaurant-module.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:destination-ready | modules/destination-content.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:environment-ready | intelligence/environment.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:global-location-setting-changed | core/places/presence-visit-core.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:global-location-updated | extern/Browser | core/context/travel-context-service.js, modules/restaurants-v2/restaurant-module.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:guided-entry-state | app/public-entry.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:in-window-data-changed | core/places/place-collection-service.js, core/places/places-final-foundation.js, core/places/timeline-core.js | app/app-shell.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:intelligence-ready | intelligence/core.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:journey-context-changed | core/context/journey-knowledge-graph.js | core/ai/ai-dashboard-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:kernel-event | intelligence/kernel/events.js | intelligence/developer-console.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:kernel-ready | intelligence/kernel/kernel.js | intelligence/kernel/kernel.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:live-day-changed | core/recommendations/live-day-companion-service.js | app/app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:logout | auth/session.js | people-system.js, supabase-sync.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:members-changed | core/trips/join-flow.js | app/app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:open-place | app/app-shell.js, modules/places-shell.js | modules/accommodations/accommodation-module.js, modules/attractions/attraction-module.js, modules/mobility/mobility-module.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:open-place-request | core/places/place-lifecycle-hub.js, core/places/timeline-core.js | app/app-shell.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:place-collection-changed | core/places/place-collection-service.js | core/ai/ai-memory-service.js, modules/accommodations/accommodation-module.js, modules/attractions/attraction-module.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:place-contract-ready | core/places/place-type-contract.js | core/places/place-type-definitions.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:place-contract-registered | core/places/place-type-contract.js | core/places/place-registry.js, core/places/place-ui-actions.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:place-definitions-ready | core/places/place-type-definitions.js | core/places/place-ui-actions.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:place-detail-committed | extern/Browser | core/places/place-detail-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:place-favorite-changed | core/places/place-collection-service.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:place-imported | intelligence/place-entity-service.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:place-overlay-closed | core/places/place-experience-shell.js, modules/restaurants-v2/restaurant-module.js | app/app-shell.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:place-plan-changed | core/places/place-ui-actions.js, core/places/places-final-foundation.js, core/places/timeline-core.js | app/app-shell.js, core/places/timeline-core.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:place-runtime-changed | core/places/place-runtime-store.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:place-visit-changed | extern/Browser | core/places/timeline-core.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:places-lifecycle-changed | core/places/place-lifecycle-service.js, core/places/places-final-foundation.js | app/app-shell.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:plan-place-suggestion | app/app-shell.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:planning-apply-requested | core/planning/planning-foundation.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:planning-dialogue-confirmed | core/planning/planning-foundation.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:planning-experiments-invalidated | core/planning/product-focus-reset.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:platform-config-changed | intelligence/platform.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:platform-lifecycle | intelligence/platform.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:platform-network-changed | intelligence/platform.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:platform-ready | intelligence/platform.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:profile-changed | core/profiles/profile-service.js | core/preferences/user-preferences-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:pwa-state | intelligence/pwa-service.js | intelligence/pwa-console.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:recommendations-changed | core/recommendations/recommendation-service.js | core/ai/ai-memory-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:restaurant-imported | intelligence/restaurant-service.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:restaurant-intelligence-changed | core/recommendations/restaurant-intelligence-service.js | app/app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:restaurant-lifecycle-changed | intelligence/restaurant-service.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:restaurant-search-enriched | intelligence/restaurant-service.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:restaurants-v2-updated | modules/restaurants-v2/restaurant-module.js | core/collaboration/collaboration-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:runtime-changed | core/runtime/runtime.js | luvia-app-state.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:schedule-intelligence-changed | core/recommendations/schedule-intelligence-service.js | app/app-shell.js, modules/accommodations/accommodation-module.js, modules/restaurants-v2/restaurant-module.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:screen-changed | extern/Browser | modules/restaurants-v2/restaurant-module.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:supabase-client-ready | core/services/supabase-service.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:theme-changed | core/services/theme-service.js | app/app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:timeline-changed | core/places/timeline-core.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:timeline-cloud-changed | core/places/timeline-core.js | app/app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:timeline-invalidated | core/places/place-ui-actions.js, core/places/places-final-foundation.js | kein statischer Listener | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:today-intelligence-changed | core/recommendations/today-intelligence-service.js | app/app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:travel-context-changed | core/context/travel-context-service.js | modules/restaurants-v2/restaurant-module.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:travel-preferences-changed | core/preferences/travel-preferences-service.js | modules/restaurants-v2/restaurant-module.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:trip-changed | core/trips/trip-experience.js, profile-center.js | core/collaboration/collaboration-service.js, core/places/place-runtime-store.js, core/places/timeline-core.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:trip-context-changed | core/trips/trip-store.js, intelligence/destination-service.js | core/context/travel-context-service.js, legacy/ui/luvia-app-shell.js, legacy/ui/luvia-dashboard.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:trip-created | core/trips/trip-creator.js | core/collaboration/collaboration-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:trip-modules-changed | core/trips/trip-experience.js, modules/module-manager.js | app/app-shell.js, legacy/ui/luvia-app-shell.js, luvia-app-shell.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:trip-place-data-changed | core/places/trip-place-data-service.js | modules/accommodations/accommodation-module.js, modules/attractions/attraction-module.js, modules/mobility/mobility-module.js | mittel | prüfen/autoritativen Refresh beibehalten |
| luvia:trips-changed | core/trips/trip-store.js | core/runtime/runtime.js, luvia-app-state.js, luvia-trip-context.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:ui-kit-ready | core/ui/ui-kit.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:ui-ready | core/ui/ui-manager.js | core/trips/trip-experience.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| luvia:user-preferences-changed | core/preferences/user-preferences-service.js | core/ai/ai-memory-service.js, core/preferences/travel-preferences-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| orientationchange | extern/Browser | legacy/ui/luvia-app-shell.js, luvia-app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| pagehide | extern/Browser | core/collaboration/collaboration-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| pageshow | extern/Browser | legacy/ui/luvia-dashboard.js, legacy/ui/luvia-v7-enhancements.js, luvia-dashboard.js | mittel | prüfen/autoritativen Refresh beibehalten |
| paris-location-updated | location-service.js, sprachcoach.js | assistant.js, people-system.js | mittel | prüfen/autoritativen Refresh beibehalten |
| paris-sync:auth-ready | sync/core.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| paris:auth-changed | auth/session.js | auth/ui.js, core/runtime/runtime.js, legacy/ui/luvia-app-shell.js | mittel | prüfen/autoritativen Refresh beibehalten |
| paris:cloud-ready | supabase-sync.js | people-system.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| paris:cloud-updated | live-moments.js, supabase-sync.js | day-closure.js, live-moments.js | mittel | prüfen/autoritativen Refresh beibehalten |
| paris:event-realtime | people-system.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| paris:gallery-updated | gallery.js | smart-photo-moments.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| paris:location-state | location-service.js | ambient.js, live-moments.js, people-system.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| paris:memory-added | live-moments.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| pointerdown | extern/Browser | core/discovery/curated-travel-canvas.js, core/profiles/profile-foundation.js, core/trips/join-flow.js | mittel | prüfen/autoritativen Refresh beibehalten |
| pointerleave | extern/Browser | core/preferences/guided-discovery-sequence.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| pointermove | extern/Browser | core/preferences/guided-discovery-sequence.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| pointerover | extern/Browser | core/places/timeline-core.js, modules/restaurants-v2/restaurant-module.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| pointerup | extern/Browser | core/discovery/curated-travel-canvas.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| reisezeit:login-success | auth/ui.js | modules/module-manager.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| reisezeit:trip-selected | core/trips/trip-store.js | kein statischer Listener | niedrig | prüfen/autoritativen Refresh beibehalten |
| scroll | extern/Browser | legacy/ui/luvia-dashboard.js, luvia-dashboard.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| statechange | extern/Browser | intelligence/pwa-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| touchend | extern/Browser | core/preferences/guided-discovery-sequence.js, legacy/ui/luvia-app-shell.js, luvia-app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| touchstart | extern/Browser | core/preferences/guided-discovery-sequence.js, legacy/ui/luvia-app-shell.js, luvia-app-shell.js | niedrig | prüfen/autoritativen Refresh beibehalten |
| updatefound | extern/Browser | intelligence/pwa-service.js | niedrig | prüfen/autoritativen Refresh beibehalten |

## Requestbefunde

- Galerie: pro `list()` zunächst ein Tabellenrequest, anschließend **ein Storage-Download pro Foto**. Das ist ein N+1-Pfad und für große Galerien ungeeignet.
- Galerie-Realtime: jede Tabellenänderung kann einen vollständigen Reconcile/Reload auslösen; zusammen mit lokalem IndexedDB-Abgleich besteht Doppelarbeit.
- Place Lifecycle: fachliche Writes laufen über Place Command/Lifecycle/Timeline-/Visit-Services; diese Struktur ist grundsätzlich die richtige Basis.
- Developer Console: Service-Tests können echte Reads, GPS oder Refreshes auslösen; Diagnosemodus verhindert nicht bei jedem Service sämtliche Nebenwirkungen.
- AI: Orchestrator und Evidence-Schicht sind zentral, aber Media-Kontext ist noch nicht begrenzt/implementiert.

## Zielregel

Eine Nutzeraktion → ein Core-Command → ein autoritativer Cloud-Write → ein gezielter Rehydrate/Realtime-Refresh. Keine Galerie-Voll-Downloads bei jeder Metadatenänderung.
