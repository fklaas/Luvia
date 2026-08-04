(function(){
'use strict';
const VERSION=window.LuviaKernelVersion?.core||'4.18.0';
const FORBIDDEN_PATTERNS=[/^luvia\.schedule\./,/^luvia\.today\./,/^luvia\.live-day\./,/^luvia\.timeline\./,/^luvia\.place-visits\./,/^luviaRestaurantsV2Demo:/];
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function activeTripId(explicit){return String(explicit||window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripContext?.getSnapshot?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||'');}
function client(){return window.LuviaSupabaseService?.getClient?.()||window.ParisSupabaseClient||window.ParisCloud?.client||null;}
function localDomainKeys(){const keys=[];try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(FORBIDDEN_PATTERNS.some(pattern=>pattern.test(String(key))))keys.push(key);}}catch{}return keys.sort();}
function serviceState(){return{
 schedule:{available:Boolean(window.LuviaScheduleIntelligence),cloudAuthoritative:Boolean(window.LuviaScheduleIntelligence?.diagnostics?.()?.cloudAuthoritative),persistence:window.LuviaScheduleIntelligence?.snapshot?.()?.persistence||null},
 timeline:{available:Boolean(window.LuviaTimelineCore),cloudAuthoritative:Boolean(window.LuviaTimelineCore?.diagnostics?.()?.cloudAuthoritative)},
 visits:{available:Boolean(window.LuviaPresenceVisitCore),cloudAuthoritative:Boolean(window.LuviaPresenceVisitCore?.diagnostics?.()?.cloudAuthoritative)},
 places:{available:Boolean(window.LuviaPlaceCore),cloudAuthoritative:Boolean(window.LuviaPlaceCore?.diagnostics?.()?.cloud?.authoritative)}
};}
async function waitForServices(timeoutMs=8000){const started=Date.now();while(Date.now()-started<timeoutMs){const services=serviceState();if(Object.values(services).every(item=>item.available))return services;await sleep(50);}return serviceState();}
async function backendProbe(tripId){const db=client();if(!db?.rpc)throw new Error('Keine authentifizierte Supabase-Verbindung verfügbar.');const {data,error}=await db.rpc('luvia_verify_place_backend',{p_trip_id:tripId});if(error)throw error;return data;}
async function rehydrate(tripId){await Promise.all([
 window.LuviaPlaceCore?.hydrateAll?.({tripId}),
 window.LuviaScheduleIntelligence?.refresh?.({tripId,force:true,skipThrottle:true}),
 window.LuviaTimelineCore?.hydrate?.(tripId),
 window.LuviaPresenceVisitCore?.hydrateVisits?.()
]);return snapshot();}
function duplicateIdentityProbe(){const a={title:"McDonald's",providerPlaceId:'google-meppen',placeId:'11111111-1111-4111-8111-111111111111'};const b={title:"McDonald's",providerPlaceId:'google-haren',placeId:'22222222-2222-4222-8222-222222222222'};return{sameTitle:a.title===b.title,distinctProviderIds:a.providerPlaceId!==b.providerPlaceId,distinctPlaceIds:a.placeId!==b.placeId,passed:a.providerPlaceId!==b.providerPlaceId&&a.placeId!==b.placeId};}
function snapshot(){const services=serviceState();const forbidden=localDomainKeys();const serviceChecks=Object.values(services).every(item=>item.available&&item.cloudAuthoritative);return{version:VERSION,status:serviceChecks&&!forbidden.length?'ready':'degraded',cloudOnly:serviceChecks&&!forbidden.length,forbiddenLocalDomainKeys:forbidden,services,duplicateIdentityProbe:duplicateIdentityProbe(),checkedAt:new Date().toISOString()};}
async function run(options={}){await waitForServices(options.timeoutMs||8000);const tripId=activeTripId(options.tripId);const before=snapshot();let backend=null;let rehydrated=false;let error=null;try{
 if(!tripId)throw new Error('Keine aktive Reise für die Cloud-Verifikation.');
 backend=await backendProbe(tripId);
 if(options.rehydrate!==false){await rehydrate(tripId);rehydrated=true;}
}catch(raw){error={message:raw?.message||String(raw),code:raw?.code||null,details:raw?.details||null,hint:raw?.hint||null};}
const after=snapshot();return clone({version:VERSION,tripId,before,after,backend,rehydrated,error,passed:after.cloudOnly&&after.duplicateIdentityProbe.passed&&!error});}
const api=Object.freeze({version:VERSION,snapshot,run,rehydrate,backendProbe,waitForServices,localDomainKeys,duplicateIdentityProbe});
window.LuviaCloudOnlyPlaceVerification=api;
window.LuviaPlaceVerification=api;
})();
