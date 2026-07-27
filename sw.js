const CACHE='luvia-shell-v10.1.0';
const SCOPE=new URL(self.registration.scope);
const scoped=path=>new URL(path.replace(/^\/+/,''),SCOPE).toString();
const OFFLINE=scoped('offline.html');
const APP_SHELL=['','index.html','offline.html','manifest.webmanifest','icon-192.png','icon-512.png','favicon.svg','favicon.ico','luvia-brand.css','core/storage/storage.js','legacy/paris/cloud-adapter.js','core/legacy/paris-migrator.js','core/trips/trip-store.js','core/trips/trip-creator.js','core/runtime/runtime.js','luvia-dashboard.css','luvia-app-shell.css','luvia-trip-context.js','luvia-app-state.js','app-gateway.js','luvia-entry.js','luvia-app-shell.js','modules/module-manager.css','modules/module-manager.js','modules/restaurants-v2/restaurant-module.css','modules/restaurants-v2/restaurant-module.js','modules/restaurants-v2/default.json','intelligence/environment.js','intelligence/platform.js','intelligence/destination-service.js','intelligence/destination-context.js','intelligence/backend-service.js','intelligence/places-service.js','intelligence/restaurant-contract.js','intelligence/pwa-service.js'].map(scoped);

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
      }catch{return await caches.match(request)}
    })());
    return;
  }

  event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{event.waitUntil(store(request,response));return response})));
});
