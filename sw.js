const CACHE='luvia-shell-v13.29.2';
const SCOPE=new URL(self.registration.scope);
const scoped=path=>new URL(path.replace(/^\/+/,''),SCOPE).toString();
const OFFLINE=scoped('offline.html');
const APP_SHELL=['','index.html','offline.html','manifest.webmanifest','icon-192.png','icon-512.png','favicon.svg','favicon.ico','luvia-logo.svg','app/app-shell.css','app/app-shell.js','app/gallery-view.css','app/gallery-view.js','app/albums-view.css','app/albums-view.js','app/navigation-registry.js','app/module-hubs.js','app/module-hubs.css','app/public-entry.css','app/public-entry.js','core/design/design-system-v3.css','core/ui/ui-kit.js','core/services/supabase-service.js','core/services/theme-service.js','core/storage/storage.js','core/media/media-metadata.js','core/media/media-core.js','core/media/memory-albums.js','core/legacy/paris-migrator.js','legacy/paris/cloud-adapter.js','core/trips/trip-store.js','core/trips/trip-creator.js','core/trips/trip-experience.js','core/runtime/runtime.js','core/modules/module-registry.js','core/dashboard/dashboard-widget-registry.js','core/collaboration/collaboration-service.js','core/context/travel-context-service.js','core/ai/ai-brain.css','core/planning/product-focus-reset.js','core/planning/planning-dialogue-service.js','core/planning/planning-candidate-research.js',
  'core/planning/planning-foundation.js','core/planning/planning-tool-registry.js','core/planning/planning-session.js','core/planning/planning-foundation.css','core/ai/ai-capability-registry.js','core/ai/ai-model-router.js','core/ai/ai-policy-service.js','core/ai/ai-output-validator.js','core/ai/ai-tool-registry.js','core/ai/ai-context-service.js','core/ai/providers/openai-provider.js','core/ai/ai-memory-service.js','core/ai/ai-command-proposal-service.js','core/ai/ai-core.js','core/ai/ai-dashboard-service.js','core/preferences/preference-schema.js','core/preferences/user-preferences-service.js','core/preferences/discovery-contract-service.js','core/preferences/guided-discovery-sequence.js','core/preferences/guided-discovery-sequence.css','core/preferences/travel-preferences-service.js','core/recommendations/recommendation-service.js','core/recommendations/restaurant-recommendation-adapter.js','core/recommendations/schedule-intelligence-service.js','core/recommendations/restaurant-intelligence-service.js','core/profiles/profile-service.js','core/profiles/profile-foundation.js','core/profiles/profile-foundation.css','core/trips/join-flow.js','modules/restaurants-v2/restaurant-module.css','modules/restaurants-v2/restaurant-module.js','modules/accommodations/accommodation-module.css','modules/accommodations/accommodation-module.js','modules/attractions/attraction-module.css','modules/attractions/attraction-module.js','modules/photo-spots/photo-spot-module.css','modules/photo-spots/photo-spot-module.js','modules/shopping/shopping-module.css','modules/shopping/shopping-module.js','modules/nature/nature-module.css','modules/nature/nature-module.js','modules/mobility/mobility-module.css','modules/mobility/mobility-module.js','modules/move-shell.css','modules/move-shell.js','intelligence/environment.js','intelligence/destination-service.js','intelligence/destination-context.js','intelligence/backend-service.js','intelligence/places-service.js','core/places/place-domain.js','intelligence/place-entity-service.js','core/places/place-type-contract.js','core/places/place-type-definitions.js','core/places/place-registry.js','core/places/place-adapters.js','core/places/place-core.js','core/places/place-runtime-store.js','core/places/trip-place-data-service.js','core/places/place-collection-service.js','core/places/place-command-service.js','core/places/timeline-core.js','core/places/presence-visit-core.js','core/places/place-lifecycle-service.js','core/places/place-lifecycle-hub.js','core/places/place-lifecycle-hub.css','core/places/place-ui-contract.js','core/places/place-provider-fields.js','core/places/place-ui-actions.js','core/places/place-ui-states.js','core/places/place-ui.js','core/places/place-experience-shell.js','core/places/photo-spot-intelligence-service.js','core/places/shopping-intelligence-service.js','core/places/nature-intelligence-service.js','core/places/transport-intelligence-service.js','core/places/place-intelligence-service.js','core/places/place-detail-service.js','core/places/place-conformance-service.js','core/places/places-final-foundation.js','core/places/places-final-foundation.css','modules/places-shell.js','modules/places-shell.css','core/places/place-ui.css','intelligence/restaurant-service.js','intelligence/pwa-service.js'].map(scoped);

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(APP_SHELL.map(async url=>{
      const response=await fetch(url,{cache:'reload'});
      if(response.ok)await cache.put(url,response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('luvia-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='CLEAR_LUVIA_CACHES')event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('luvia-')).map(key=>caches.delete(key)))));
});

function bypass(url){
  return url.origin!==self.location.origin||url.hostname.includes('supabase.co')||url.pathname.includes('/rest/v1/')||url.pathname.includes('/auth/v1/')||url.pathname.includes('/functions/v1/');
}
function canCache(request,response){return !request.headers.has('range')&&response.status===200&&response.type!=='opaque'}
async function store(request,response){if(!canCache(request,response))return;const copy=response.clone();const cache=await caches.open(CACHE);await cache.put(request,copy)}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.headers.has('range'))return;
  const url=new URL(request.url);
  if(bypass(url))return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request,{cache:'no-store'});
        event.waitUntil(store(request,response));
        return response;
      }catch{
        return await caches.match(request)||await caches.match(scoped('index.html'))||await caches.match(OFFLINE);
      }
    })());
    return;
  }

  if(/\.(?:js|css|json|webmanifest)$/i.test(url.pathname)){
    event.respondWith((async()=>{
      const activeCache=await caches.open(CACHE);
      const cached=await activeCache.match(request,{ignoreSearch:true});
      try{
        const response=await fetch(request,{cache:'no-store'});
        if(response.ok){event.waitUntil(store(request,response));return response;}
        return cached||response;
      }catch{return cached||new Response('',{status:503,statusText:'Offline'})}
    })());
    return;
  }

  event.respondWith((async()=>{const hit=await caches.match(request);if(hit)return hit;try{const response=await fetch(request);event.waitUntil(store(request,response));return response}catch{return new Response('',{status:503,statusText:'Offline'})}})());
});
