(() => {
  'use strict';
  const VERSION='4.0.4.2';
  const BUILD='13.0.4.2';
  const now=()=>new Date().toISOString();
  const safe=(fn,fallback=null)=>{try{return fn()}catch(error){return fallback??{error:error?.message||String(error)}}};
  const textBytes=value=>new TextEncoder().encode(String(value||'')).length;
  const listStorage=()=>{const rows=[],limit=Math.min(localStorage.length,150);for(let i=0;i<limit;i++){const key=localStorage.key(i);if(!key?.startsWith('luvia.'))continue;const value=localStorage.getItem(key)||'';const bytes=textBytes(value);let validJson=null;if(bytes<=262144&&/schedule|timeline|place-visits|core4/.test(key))validJson=safe(()=>{JSON.parse(value);return true},false);rows.push({key,bytes,validJson});}return rows};
  const scheduleTrace=()=>{const s=safe(()=>window.LuviaScheduleIntelligence?.snapshot?.(),{})||{};return (s.events||[]).map(event=>({id:event.id,entityType:event.entityType,placeId:event.placeId||event.source?.placeId||event.source?.providerPlaceId||null,tripId:event.tripId||event.source?.tripId||s.tripId||null,title:event.title,date:event.date,time:event.time,startAt:event.startAt,durationMinutes:event.durationMinutes,persistence:event.persistence||'local+remote-merge',sourceAvailable:Boolean(event.source),dashboardVisible:(s.today||[]).some(x=>String(x.id)===String(event.id)),mergeKey:`${event.entityType||'place'}:${event.id}`}));};
  const recommendationTrace=()=>{const rec=safe(()=>window.LuviaRecommendations?.diagnostics?.(),{})||{},cross=safe(()=>window.LuviaCrossModuleRecommendations?.diagnostics?.(),{})||{},restaurant=safe(()=>window.LuviaRestaurantIntelligence?.diagnostics?.(),{})||{};const candidates=(restaurant.restaurants||[]).slice(0,12).map(item=>({id:item.id||item.placeId,name:item.name,score:item.intelligence?.score??item.matchScore??null,reasons:(item.intelligence?.reasons||item.recommendation?.reasons||[]).slice(0,4),warnings:(item.intelligence?.warnings||item.recommendation?.warnings||[]).slice(0,3),distanceMeters:item.distanceMeters??null,openNow:item.openNow??null}));const slots={};for(const [key,value] of Object.entries(cross.slots||{}))slots[key]=Array.isArray(value)?value.slice(0,8).map(item=>({id:item?.id||item?.placeId||null,name:item?.name||item?.title||null,score:item?.score??item?.matchScore??null})):[];return{engine:{version:rec.version,status:rec.status,metrics:rec.metrics},slots,candidates};};
  const compatibilityAudit=()=>({
    restaurantEntityAdapter:{state:window.LuviaPlaceRegistry?.getAdapter?.('restaurant')?.state||'unknown',required:true,decision:'keep-until-universal-persistence'},
    restaurantLifecycleBridge:{state:Boolean(window.LuviaPlaceCore&&window.LuviaRestaurants)?'active':'missing',required:true,decision:'keep-for-restaurant-specific-fields'},
    restaurantScheduleBridge:{state:typeof window.LuviaScheduleIntelligence?.upsertRestaurant==='function'?'active':'missing',required:false,decision:'compatibility-wrapper-over-upsertEvent'},
    legacyPlacesAlias:{state:Boolean(window.LuviaPlacesCore),'required':false,decision:'remove-after-cache-support-window'},
    restaurantServiceAlias:{state:Boolean(window.LuviaRestaurantService||window.LuviaRestaurants),required:true,decision:'keep-for-stale-client-compatibility'}
  });
  const adapterHealth=()=>safe(()=>window.LuviaPlaceRegistry?.diagnostics?.().adapters,[])||[];
  const visitTrace=()=>{const timeline=safe(()=>window.LuviaTimelineCore?.diagnostics?.(),{})||{},presence=safe(()=>window.LuviaPresenceVisitCore?.diagnostics?.(),{})||{};return{timeline,presence,states:['nearby','arrived','stay_detected','visited','left']};};
  const cacheAudit=()=>{const storage=listStorage(),invalid=storage.filter(x=>x.validJson===false);return{serviceWorkerController:Boolean(navigator.serviceWorker?.controller),online:navigator.onLine,entryCount:storage.length,largestEntries:storage.slice().sort((a,b)=>b.bytes-a.bytes).slice(0,20),totalBytes:storage.reduce((n,x)=>n+x.bytes,0),invalidEntries:invalid.slice(0,20),healthy:invalid.length===0};};
  const performance=()=>{const nav=performance.getEntriesByType?.('navigation')?.[0];const services=safe(()=>window.LuviaServiceRegistry?.diagnostics?.(),{})||{};return{navigation:nav?{domInteractive:Math.round(nav.domInteractive),domContentLoaded:Math.round(nav.domContentLoadedEventEnd),load:Math.round(nav.loadEventEnd)}:null,serviceInitMs:(services.services||[]).map(s=>({name:s.name,initMs:s.metrics?.initMs??null})),resourceCount:performance.getEntriesByType?.('resource')?.length||0};};
  async function runSmokeTests(){
    const results=[];const test=(name,fn)=>{try{const detail=fn();const ok=typeof detail==='boolean'?detail:Boolean(detail?.ok??detail);results.push({name,ok,detail,at:now()})}catch(error){results.push({name,ok:false,error:error.message,at:now()})}};
    test('Kernel boot',()=>Boolean(window.LuviaKernel));
    test('Service registry',()=>{const d=window.LuviaServiceRegistry?.diagnostics?.()||{};return{ok:d.count>=23&&d.ready===d.count,count:d.count,ready:d.ready}});
    test('11 Place Types',()=>({ok:(window.LuviaPlaceRegistry?.diagnostics?.().registeredTypes||0)===11,value:window.LuviaPlaceRegistry?.diagnostics?.().registeredTypes}));
    test('11 Adapters',()=>({ok:(window.LuviaPlaceRegistry?.diagnostics?.().registeredAdapters||0)===11,value:window.LuviaPlaceRegistry?.diagnostics?.().registeredAdapters}));
    test('Restaurant Adapter',()=>({ok:window.LuviaPlaceRegistry?.getAdapter?.('restaurant')?.state==='ready',state:window.LuviaPlaceRegistry?.getAdapter?.('restaurant')?.state}));
    test('Place UI',()=>({ok:window.LuviaPlaceUI?.diagnostics?.().status==='ready',detail:window.LuviaPlaceUI?.diagnostics?.()}));
    test('Schedule contract',()=>({ok:['upsertEvent','removeEvent','snapshot','analyze'].every(k=>typeof window.LuviaScheduleIntelligence?.[k]==='function')}));
    test('Timeline contract',()=>({ok:['record','list','diagnostics'].every(k=>typeof window.LuviaTimelineCore?.[k]==='function')}));
    test('Manual Visit contract',()=>({ok:typeof window.LuviaPlaceCore?.recordVisit==='function'&&typeof window.LuviaPresenceVisitCore?.confirmVisit==='function'}));
    test('Recommendation Slots',()=>({ok:['forYou','rightNow','nearby','onYourWay','next','alternative'].every(k=>Array.isArray(window.LuviaCrossModuleRecommendations?.diagnostics?.().slots?.[k]))}));
    test('Dashboard today data',()=>({ok:Array.isArray(window.LuviaScheduleIntelligence?.snapshot?.().today),count:window.LuviaScheduleIntelligence?.snapshot?.().today?.length||0}));
    const summary={ok:results.every(x=>x.ok),passed:results.filter(x=>x.ok).length,total:results.length,results,completedAt:now()};
    try{sessionStorage.setItem('luvia.core4.smoke.latest',JSON.stringify(summary))}catch{}
    return summary;
  }
  function snapshot(){const places=safe(()=>window.LuviaPlaceCore?.diagnostics?.(),{})||{},services=safe(()=>window.LuviaServiceRegistry?.diagnostics?.(),{})||{};return{version:VERSION,build:BUILD,status:'ready',generatedAt:now(),health:{kernel:Boolean(window.LuviaKernel),servicesReady:services.ready||0,servicesTotal:services.count||0,placeTypes:places.registry?.registeredTypes||0,adapters:places.registry?.registeredAdapters||0,scheduleEvents:window.LuviaScheduleIntelligence?.snapshot?.().events?.length||0,timelineEvents:window.LuviaTimelineCore?.diagnostics?.().eventCount||0},adapters:adapterHealth(),recommendations:recommendationTrace(),schedule:scheduleTrace(),visits:visitTrace(),compatibility:compatibilityAudit(),cache:cacheAudit(),performance:performance(),lastSmoke:safe(()=>JSON.parse(sessionStorage.getItem('luvia.core4.smoke.latest')||'null'),null)};}
  window.LuviaCore4Diagnostics=Object.freeze({version:VERSION,build:BUILD,snapshot,runSmokeTests,recommendationTrace,scheduleTrace,visitTrace,adapterHealth,compatibilityAudit,cacheAudit,performance});
})();
