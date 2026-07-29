const CACHE='luvia-shell-v13.6.3';
const SCOPE=new URL(self.registration.scope);
const scoped=path=>new URL(path.replace(/^\/+/,''),SCOPE).toString();
const OFFLINE=scoped('offline.html');
const APP_SHELL=['','index.html','offline.html','manifest.webmanifest','icon-192.png','icon-512.png','favicon.svg','favicon.ico','luvia-logo.svg','app/app-shell.css','app/app-shell.js','core/design/design-system-v3.css','core/ui/ui-kit.js','core/services/supabase-service.js','core/services/theme-service.js','core/storage/storage.js','core/legacy/paris-migrator.js','legacy/paris/cloud-adapter.js','core/trips/trip-store.js','core/trips/trip-creator.js','core/trips/trip-experience.js','core/runtime/runtime.js','core/modules/module-registry.js','core/dashboard/dashboard-widget-registry.js','core/collaboration/collaboration-service.js','core/context/travel-context-service.js','core/preferences/travel-preferences-service.js','core/recommendations/recommendation-service.js','core/recommendations/restaurant-recommendation-adapter.js','core/recommendations/schedule-intelligence-service.js','core/recommendations/restaurant-intelligence-service.js','core/profiles/profile-service.js','core/trips/join-flow.js','modules/restaurants-v2/restaurant-module.css','modules/restaurants-v2/restaurant-module.js','modules/accommodations/accommodation-module.css','modules/accommodations/accommodation-module.js','modules/attractions/attraction-module.css','modules/attractions/attraction-module.js','intelligence/environment.js','intelligence/destination-service.js','intelligence/destination-context.js','intelligence/backend-service.js','intelligence/places-service.js','core/places/place-domain.js','core/places/place-registry.js','core/places/place-adapters.js','core/places/place-core.js','core/places/place-ui.js','core/places/place-experience-shell.js','core/places/place-intelligence-service.js','core/places/place-detail-service.js','modules/places-shell.js','modules/places-shell.css','core/places/place-ui.css','intelligence/restaurant-service.js','intelligence/pwa-service.js'].map(scoped);

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
      try{
        const response=await fetch(request,{cache:'no-store'});
        event.waitUntil(store(request,response));
        return response;
      }catch{return await caches.match(request)||new Response('',{status:503,statusText:'Offline'})}
    })());
    return;
  }

  event.respondWith((async()=>{const hit=await caches.match(request);if(hit)return hit;try{const response=await fetch(request);event.waitUntil(store(request,response));return response}catch{return new Response('',{status:503,statusText:'Offline'})}})());
});
