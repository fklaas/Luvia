(function(){
'use strict';
const VERSION='4.2.0.1';
const FORBIDDEN_PATTERNS=[/^luvia\.schedule\./,/^luvia\.today\./,/^luvia\.live-day\./,/^luvia\.timeline\./,/^luvia\.place-visits\./,/^luviaRestaurantsV2Demo:/];
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function localDomainKeys(){const keys=[];try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(FORBIDDEN_PATTERNS.some(pattern=>pattern.test(String(key))))keys.push(key);}}catch{}return keys;}
function serviceState(){return{
 schedule:{available:Boolean(window.LuviaScheduleIntelligence),cloudAuthoritative:Boolean(window.LuviaScheduleIntelligence?.diagnostics?.()?.cloudAuthoritative),persistence:window.LuviaScheduleIntelligence?.snapshot?.()?.persistence||null},
 timeline:{available:Boolean(window.LuviaTimelineCore),cloudAuthoritative:Boolean(window.LuviaTimelineCore?.diagnostics?.()?.cloudAuthoritative)},
 visits:{available:Boolean(window.LuviaPresenceVisitCore),cloudAuthoritative:Boolean(window.LuviaPresenceVisitCore?.diagnostics?.()?.cloudAuthoritative)},
 places:{available:Boolean(window.LuviaPlaceCore),cloudAuthoritative:Boolean(window.LuviaPlaceCore?.diagnostics?.()?.cloud?.authoritative)}
};}
async function rehydrate(tripId){const id=String(tripId||window.LuviaTripContext?.getActiveTrip?.()?.tripId||'');if(!id)throw new Error('Keine aktive Reise für Cloud-Rehydration.');await Promise.all([
 window.LuviaPlaceCore?.hydrateAll?.({tripId:id}),
 window.LuviaScheduleIntelligence?.refresh?.({tripId:id,force:true,skipThrottle:true}),
 window.LuviaTimelineCore?.hydrate?.(id),
 window.LuviaPresenceVisitCore?.hydrateVisits?.()
]);return snapshot();}
function duplicateIdentityProbe(){const base={entityType:'restaurant',title:"McDonald's",date:'2026-07-28',time:'18:00'};const a={...base,providerPlaceId:'google-meppen',placeId:'11111111-1111-4111-8111-111111111111'};const b={...base,providerPlaceId:'google-haren',placeId:'22222222-2222-4222-8222-222222222222'};return{distinctProviderIds:a.providerPlaceId!==b.providerPlaceId,distinctPlaceIds:a.placeId!==b.placeId,expectedDistinct:true};}
function snapshot(){const services=serviceState(),forbidden=localDomainKeys();const serviceChecks=Object.values(services).every(x=>x.available&&x.cloudAuthoritative);return{version:VERSION,status:serviceChecks&&!forbidden.length?'ready':'degraded',cloudOnly:serviceChecks&&!forbidden.length,forbiddenLocalDomainKeys:forbidden,services,duplicateIdentityProbe:duplicateIdentityProbe(),checkedAt:new Date().toISOString()};}
async function run(options={}){const before=snapshot();let rehydrated=null,error=null;if(options.rehydrate!==false){try{rehydrated=await rehydrate(options.tripId);}catch(e){error=e?.message||String(e);}}const after=snapshot();return clone({before,after,rehydrated:Boolean(rehydrated),error,passed:after.cloudOnly&&!error});}
window.LuviaCloudOnlyPlaceVerification=Object.freeze({version:VERSION,snapshot,run,rehydrate,localDomainKeys,duplicateIdentityProbe});
})();
