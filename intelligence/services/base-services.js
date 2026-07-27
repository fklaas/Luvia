(function(){
  'use strict';
  const R=window.LuviaServiceRegistry;
  if(!R)throw new Error('LuviaServiceRegistry fehlt.');
  const ready=status=>({state:R.states.READY,...status});
  const safeJson=value=>{try{return JSON.parse(JSON.stringify(value));}catch{return null;}};
  let pwaLoadPromise=null;

  let recommendationLoadPromise=null;
  function recommendationScriptUrl(relativePath){
    const base=new URL(document.currentScript?.src||'services/base-services.js',document.baseURI);
    return new URL('../../'+relativePath,base).href;
  }
  function loadScriptOnce(src,marker){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-${marker}],script[src="${src}"]`);
      if(existing){
        if(existing.dataset.loaded==='true'){resolve();return;}
        existing.addEventListener('load',()=>resolve(),{once:true});
        existing.addEventListener('error',()=>reject(new Error(`Script konnte nicht geladen werden: ${src}`)),{once:true});
        setTimeout(()=>resolve(),300);
        return;
      }
      const script=document.createElement('script');
      script.src=src;
      script.dataset[marker.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='true';
      script.onload=()=>{script.dataset.loaded='true';resolve();};
      script.onerror=()=>reject(new Error(`Script konnte nicht geladen werden: ${src}`));
      document.head.appendChild(script);
    });
  }
  async function ensureRecommendationApi(){
    if(recommendationLoadPromise)return recommendationLoadPromise;
    recommendationLoadPromise=(async()=>{
      if(!window.LuviaRecommendations){
        await loadScriptOnce(recommendationScriptUrl('core/recommendations/recommendation-service.js?v=11.9.0'),'luvia-recommendation-service');
      }
      if(!window.LuviaRecommendations)throw new Error('Recommendation API konnte nicht initialisiert werden.');
      const adapters=window.LuviaRecommendations.diagnostics?.().adapters||[];
      if(!adapters.includes('restaurants')){
        await loadScriptOnce(recommendationScriptUrl('core/recommendations/restaurant-recommendation-adapter.js?v=11.9.0'),'luvia-recommendation-adapter');
      }
      return window.LuviaRecommendations;
    })().catch(error=>{recommendationLoadPromise=null;throw error;});
    return recommendationLoadPromise;
  }
  function pwaScriptUrl(){
    const base=new URL(document.currentScript?.src||'services/base-services.js',document.baseURI);
    return new URL('../pwa-service.js?v=11.6.3',base).href;
  }
  function ensurePwaApi(){
    if(window.LuviaPWA)return Promise.resolve(window.LuviaPWA);
    if(pwaLoadPromise)return pwaLoadPromise;
    pwaLoadPromise=new Promise((resolve,reject)=>{
      const finish=()=>window.LuviaPWA?resolve(window.LuviaPWA):reject(new Error('LuviaPWA API konnte nicht initialisiert werden.'));
      const loadFresh=()=>{
        if(window.LuviaPWA){resolve(window.LuviaPWA);return;}
        const script=document.createElement('script');
        script.src=pwaScriptUrl();
        script.dataset.luviaPwaService='diagnostic';
        script.onload=finish;
        script.onerror=()=>reject(new Error('PWA-Service konnte nicht geladen werden.'));
        document.head.appendChild(script);
      };
      const existing=document.querySelector('script[data-luvia-pwa-service],script[src*="pwa-service.js"]');
      if(!existing){loadFresh();return;}
      if(window.LuviaPWA){resolve(window.LuviaPWA);return;}
      existing.addEventListener('load',()=>window.LuviaPWA?resolve(window.LuviaPWA):loadFresh(),{once:true});
      existing.addEventListener('error',loadFresh,{once:true});
      setTimeout(()=>window.LuviaPWA?resolve(window.LuviaPWA):loadFresh(),250);
    }).catch(error=>{pwaLoadPromise=null;throw error;});
    return pwaLoadPromise;
  }
  function canonicalTripSnapshot(){
    try{
      if(window.LuviaTripStore){
        const store=window.LuviaTripStore.snapshot?.();
        if(!store?.loaded)window.LuviaTripStore.initialize?.();
        const refreshed=window.LuviaTripStore.snapshot?.();
        const trip=refreshed?.activeTrip||null;
        if(trip)return {
          trip,
          tripId:trip.id||trip.tripId||trip.trip_id||null,
          tripName:trip.title||trip.tripName||trip.trip_name||'',
          destination:trip.destination||null,
          startDate:trip.startDate||trip.start_date||null,
          endDate:trip.endDate||trip.end_date||null
        };
      }
    }catch(error){console.warn('[Luvia Diagnostics] TripStore konnte nicht gelesen werden.',error);}
    const legacy=window.LuviaTripContext?.getSnapshot?.()||{};
    return legacy;
  }


  R.register({name:'environment',version:window.LuviaEnvironment?.version||'2.3',description:'Erkennt Hosting, URLs, PWA- und Native-Kontext.',async init(){if(!window.LuviaEnvironment)throw new Error('Environment API fehlt.');},status(){return ready({environment:window.LuviaEnvironment.current().name});},diagnostics(){return window.LuviaEnvironment.snapshot();},test(){const s=window.LuviaEnvironment.snapshot();const checks={baseUrl:Boolean(s.baseUrl),appIndex:Boolean(s.appIndex),secure:Boolean(s.secureContext),resolved:window.LuviaEnvironment.resolveUrl('intelligence/test.html').includes('intelligence/test.html')};return{ok:Object.values(checks).every(Boolean),message:'URL-Auflösung geprüft.',checks,snapshot:s};}});

  R.register({name:'storage',version:'1.0.0-web-adapter',description:'Einheitlicher Browser-Speicheradapter als Vorstufe zur Platform Layer.',dependencies:['environment'],init(){const key='luvia-service-storage-probe';localStorage.setItem(key,'ok');if(localStorage.getItem(key)!=='ok')throw new Error('localStorage ist nicht verfügbar.');localStorage.removeItem(key);},status(){return ready({backend:'localStorage'});},diagnostics(){return{backend:'localStorage',entries:localStorage.length,estimatedBytes:Object.keys(localStorage).reduce((n,k)=>n+k.length+(localStorage.getItem(k)||'').length,0)};},test(){const key='luvia-service-test-'+Date.now(),value={ok:true,at:new Date().toISOString()};localStorage.setItem(key,JSON.stringify(value));const read=JSON.parse(localStorage.getItem(key)||'null');localStorage.removeItem(key);return{ok:read?.ok===true&&localStorage.getItem(key)===null,message:'Schreiben, Lesen und Löschen erfolgreich.',checks:{write:Boolean(read),read:read?.ok===true,remove:localStorage.getItem(key)===null}};}});

  R.register({name:'auth',version:'3.3.0-central-supabase-client',description:'Zentraler Supabase-Authentifizierungsdienst für reguläre Benutzerkonten.',dependencies:['environment','storage'],async init(){if(!window.ParisAuth)throw new Error('ParisAuth API fehlt.');if(!window.LuviaSupabaseService?.start)throw new Error('Zentraler Supabase-Service fehlt.');const client=await window.LuviaSupabaseService.start();await window.ParisAuth.ensureInitialSession(client);},status(){const s=window.ParisAuth.getState();return ready({authenticated:s.authenticated,anonymous:false,loading:s.loading,clientReady:Boolean(window.LuviaSupabaseService?.getClient?.())});},diagnostics(){const s=window.ParisAuth.getState();return{authenticated:s.authenticated,anonymous:false,loading:s.loading,email:s.email||'',provider:s.provider||'',userId:s.user?.id||null,lastEvent:s.lastEvent,supabase:window.LuviaSupabaseService?.diagnostics?.()||null};},test(){const s=window.ParisAuth.getState(),clientReady=Boolean(window.LuviaSupabaseService?.getClient?.());return{ok:clientReady&&!s.loading&&Boolean(s.user),message:s.authenticated?'Reguläre angemeldete Sitzung erkannt.':'Keine aktive reguläre Sitzung.',checks:{clientReady,initialized:!s.loading,userPresent:Boolean(s.user),sessionPresent:Boolean(s.session),anonymousDisabled:!s.anonymous}};}});

  R.register({name:'user',version:'3.3.0-profile-derived',description:'Stellt ein normalisiertes Benutzerprofil für Core-Services bereit.',dependencies:['auth'],status(){const s=window.ParisAuth.getState();return ready({userId:s.user?.id||null});},diagnostics(){const s=window.ParisAuth.getState();return{userId:s.user?.id||null,email:s.email||'',displayName:s.user?.user_metadata?.display_name||s.user?.user_metadata?.first_name||'',provider:s.provider||'',authenticated:s.authenticated,anonymous:s.anonymous};},test(){const s=window.ParisAuth.getState(),id=s.user?.id;return{ok:Boolean(id),message:id?'Benutzerkontext normalisiert.':'Keine User-ID vorhanden.',checks:{userId:Boolean(id),provider:Boolean(s.provider||s.anonymous),metadataReadable:Boolean(s.user?.user_metadata||{})}};}});

  R.register({name:'data',version:window.LuviaData?.version||'2.2',description:'Persistente Daten-API mit Supabase, Cache und Sync Queue.',dependencies:['auth','storage'],init(){if(!window.LuviaData)throw new Error('LuviaData API fehlt.');},status(){const s=window.LuviaData.snapshot();return ready({online:s.online,queueCount:s.queueCount});},diagnostics(){return window.LuviaData.snapshot();},test(){const required=['list','get','create','update','remove','upsert','flush','snapshot'];const checks=Object.fromEntries(required.map(k=>[k,typeof window.LuviaData[k]==='function']));const snap=window.LuviaData.snapshot();return{ok:Object.values(checks).every(Boolean),message:'Data API und Queue-Status geprüft.',checks,queueCount:snap.queueCount,online:snap.online};}});

  R.register({name:'trips',version:'3.3.0-canonical-trip-store',description:'Normalisiert aktive Reise, Zeitraum, Rolle und Ziel.',dependencies:['data','user'],init(){if(!window.LuviaTripStore&&!window.LuviaTripContext)throw new Error('Kein zentraler Reise-Kontext verfügbar.');if(window.LuviaTripStore&&!window.LuviaTripStore.snapshot?.().loaded)window.LuviaTripStore.initialize?.();},status(){const s=canonicalTripSnapshot();return ready({tripId:s.tripId||null,tripName:s.tripName||'',destination:Boolean(s.destination)});},diagnostics(){return safeJson(canonicalTripSnapshot());},test(){const s=canonicalTripSnapshot();const destination=s.destination||{};const hasDestination=Boolean(typeof destination==='string'?destination.trim():destination.name||destination.formattedAddress||destination.displayName);const checks={tripId:Boolean(s.tripId),tripName:Boolean(s.tripName),destination:hasDestination,dates:Boolean(s.startDate&&s.endDate)};const required=checks.tripId&&checks.tripName&&checks.destination;return{ok:required,message:required?(checks.dates?'Aktive Reise vollständig erkannt.':'Aktive Reise und Reiseziel erkannt; Zeitraum ist optional noch offen.'):'Keine vollständig erkennbare aktive Reise.',checks,severity:required&&!checks.dates?'limited':required?'ready':'failed'};}});

  R.register({name:'events',version:window.LuviaKernelEvents?.version||'2.4.4',description:'Entkoppelte Kommunikation zwischen Core-Services und Modulen.',dependencies:['environment'],init(){if(!window.LuviaKernelEvents)throw new Error('Event Bus API fehlt.');},status(){const d=window.LuviaKernelEvents.diagnostics();return ready({subscriptions:d.subscriptionCount,history:d.historyCount});},diagnostics(){return window.LuviaKernelEvents.diagnostics();},async test(){return window.LuviaEventBusTest?.run?window.LuviaEventBusTest.run():{ok:Boolean(window.LuviaKernelEvents),message:'Event Bus API erkannt.'};}});


  R.register({name:'platform',version:window.LuviaPlatform?.version||'2.9.0',description:'Zentrale Platform Layer mit Web-Adapter für Runtime, Storage, Netzwerk, Lifecycle, Navigation und Gerätefunktionen.',dependencies:['environment','events'],async init(){if(!window.LuviaPlatform)throw new Error('LuviaPlatform API fehlt.');await window.LuviaPlatform.load();},status(){const s=window.LuviaPlatform.snapshot();return ready({channel:s.build.channel,maintenance:s.maintenance.enabled,online:s.capabilities.online});},diagnostics(){return window.LuviaPlatform.snapshot();},async test(){return window.LuviaPlatformTest?.run?window.LuviaPlatformTest.run():{ok:Boolean(window.LuviaPlatform),message:'Platform API erkannt.'};}});


  R.register({name:'pwa',version:window.LuviaPWA?.version||'3.0.2.3-diagnostics',description:'Installation, Offline-App-Shell, Cache-Versionen und kontrollierte Updates.',dependencies:['environment','storage','events','platform'],async init(){const pwa=await ensurePwaApi();await pwa.register();},status(){const s=window.LuviaPWA?.snapshot?.()||{registered:false,installed:false,updateAvailable:false,online:navigator.onLine};return ready({registered:s.registered,controller:s.controller,installed:s.installed,installable:s.installable,updateAvailable:s.updateAvailable,online:s.online});},diagnostics(){return window.LuviaPWA?.snapshot?.()||{available:false,reason:'PWA API noch nicht initialisiert'};},async test(){await ensurePwaApi();return window.LuviaPWATest?.run?window.LuviaPWATest.run():{ok:Boolean(window.LuviaPWA),message:'PWA API erkannt.'};}});

  R.register({name:'destination',version:window.LuviaDestination?.version||'2.9.0',description:'Zentraler Destination Service mit Registry, Cache, Resolver, Validation, Context und Reise-Migration.',dependencies:['data','trips','events'],async init(){if(!window.LuviaDestination)throw new Error('LuviaDestination API fehlt.');await window.LuviaDestination.init();},status(){const d=window.LuviaDestination.diagnostics();return ready({destination:d.active?.displayName||d.active?.name||'',usable:Boolean(d.active?.isUsable),resolved:Boolean(d.active?.isResolved),registryCount:d.registryCount});},diagnostics(){return window.LuviaDestination.diagnostics();},async test(){return window.LuviaDestinationTest?.run?window.LuviaDestinationTest.run():{ok:Boolean(window.LuviaDestination),message:'Destination API erkannt.'};}});

  R.register({name:'backend',version:window.LuviaBackend?.version||'2.10.0',description:'Sicheres Edge-Function-Gateway mit Authentifizierung, Request-IDs, Timeouts, Redaction, Rate-Limit-Vertrag und strukturiertem Logging.',dependencies:['auth','environment','events','platform'],init(){if(!window.LuviaBackend)throw new Error('LuviaBackend API fehlt.');window.LuviaBackend.init();},status(){const d=window.LuviaBackend.diagnostics();return ready({configured:d.configured,secureContext:d.secureContext,functionName:d.functionName,requests:d.metrics.requests,failures:d.metrics.failures});},diagnostics(){return window.LuviaBackend.diagnostics();},async test(){return window.LuviaBackendTest?.run?window.LuviaBackendTest.run():window.LuviaBackend.testContract();}});

  R.register({name:'places',version:window.LuviaPlaces?.version||'2.11.2',description:'Zentrales Google Places Gateway für Text Search, Nearby Search, Autocomplete, Details, Fotos, Normalisierung und Cache.',dependencies:['backend','destination','events'],init(){if(!window.LuviaPlaces)throw new Error('LuviaPlaces API fehlt.');window.LuviaPlaces.init();},status(){const d=window.LuviaPlaces.diagnostics();return ready({backendAvailable:d.backendAvailable,destination:d.destination?.displayName||d.destination?.name||'',requests:d.metrics.requests,cacheHits:d.metrics.cacheHits,failures:d.metrics.failures});},diagnostics(){return window.LuviaPlaces.diagnostics();},async test(){return window.LuviaPlacesTest?.run?window.LuviaPlacesTest.run():window.LuviaPlaces.testContract();}});

  R.register({name:'recommendations',version:window.LuviaRecommendations?.version||'3.7.0',description:'Zentrale Smart Recommendation Engine mit Group Context, Candidate Provider Registry, harten Constraints, erklärbaren Scores, vollständigem Decision Tracking und kontrollierbarer Runtime.',dependencies:['backend','places','trips','events'],async init(){await ensureRecommendationApi();},status(){const api=window.LuviaRecommendations;if(!api)return{state:R.states.WARNING,reason:'Recommendation API wird geladen.'};const d=api.diagnostics?.()||{adapters:[],metrics:{}};return ready({adapters:d.adapters?.length||0,generated:d.metrics?.generated||0,accepted:d.metrics?.accepted||0,rejected:d.metrics?.rejected||0});},async diagnostics(){const api=await ensureRecommendationApi();return api.diagnostics();},async test(){const api=await ensureRecommendationApi();const results=await api.get({module:'restaurants',candidates:[{id:'console-contract-test',name:'Vegetarisches Rooftop',rating:4.7,distanceMeters:800,openNow:true,features:{servesVegetarianFood:true,reservable:true}}],persist:false,limit:1});const diagnostics=api.diagnostics();const explanation=api.explain(results[0]);return{ok:results.length===1&&Number.isFinite(results[0].score)&&diagnostics.providers.includes('restaurants'),message:'Complete Foundation mit Runtime, Provider, Adapter, Group Context, Constraints und Explainability geprüft.',checks:{api:Boolean(api),adapter:diagnostics.adapters.includes('restaurants'),provider:diagnostics.providers.includes('restaurants'),groupContext:Boolean(diagnostics.context?.group),constraints:Boolean(explanation?.constraints),score:Number.isFinite(results[0]?.score),explain:Boolean(explanation)}};}});

  R.register({name:'developer',version:'3.3.0',description:'Stellt Logs, Events und Service-Diagnosen für Entwickler bereit.',dependencies:['environment','data','trips','events','platform','pwa','backend','places'],status(){return ready({logs:window.LuviaKernelLogger?.diagnostics()?.entries||0,events:window.LuviaKernelEvents?.diagnostics()?.historyCount||0});},diagnostics(){return{logger:window.LuviaKernelLogger?.diagnostics(),events:window.LuviaKernelEvents?.diagnostics(),registryCount:R.list().length};},async test(){const token='service-test-'+Date.now();const received=[];const off=window.LuviaKernelEvents.on('developer.service.test',event=>received.push(event));const result=await window.LuviaKernelEvents.emit('developer.service.test',{token});off();window.LuviaKernelLogger.info('developer','Developer Service Selbsttest',{token});return{ok:received.length===1&&result.event?.payload?.token===token,message:'Event und Log wurden erzeugt.',checks:{eventReceived:received.length===1,eventPayload:result.event?.payload?.token===token,loggerAvailable:Boolean(window.LuviaKernelLogger)}};}});
})();
