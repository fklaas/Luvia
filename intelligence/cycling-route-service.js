(function(){
'use strict';
const VERSION='4.11.1';
const CACHE_TTL=10*60_000;
const state={requests:0,successes:0,failures:0,cacheHits:0,lastError:null,lastResult:null,cache:new Map()};
const clean=value=>String(value??'').trim();
function destination(input){
 const raw=input||window.LuviaDestination?.getActive?.()||null;if(!raw)return null;
 const center=raw.location||raw.center||raw.coordinates||raw.canonicalCity?.center||null;
 return{id:raw.id||null,name:raw.name||raw.displayName||raw.canonicalCity?.name||'',displayName:raw.displayName||raw.name||raw.canonicalCity?.name||'',countryCode:raw.countryCode||raw.country?.code||'',location:center?{latitude:Number(center.latitude??center.lat),longitude:Number(center.longitude??center.lng)}:null,searchRadiusMeters:Number(raw.searchRadiusMeters)||100000};
}
function cacheKey(action,payload){return`${action}:${JSON.stringify(payload)}`}
function fromCache(key){const item=state.cache.get(key);if(!item)return null;if(item.expires<Date.now()){state.cache.delete(key);return null}state.cacheHits++;return item.value}
function remember(key,value){state.cache.set(key,{expires:Date.now()+CACHE_TTL,value});return value}
async function call(action,payload={},options={}){
 const key=cacheKey(action,payload),hit=action==='cycling.search'?fromCache(key):null;if(hit)return hit;
 state.requests++;
 try{
  const response=await window.LuviaBackend.request(action,payload,{timeoutMs:Number(options.timeoutMs)||9500});
  state.successes++;state.lastError=null;state.lastResult=response?.data||null;
  return action==='cycling.search'?remember(key,response):response;
 }catch(error){state.failures++;state.lastError={code:error.code||'CYCLING_REQUEST_FAILED',message:error.message||String(error),at:new Date().toISOString()};throw error}
}
async function search(query='',options={}){
 let target=destination(options.destination);
 if(!target?.location&&window.LuviaDestination?.ensureResolved){const resolved=await window.LuviaDestination.ensureResolved(options.destination||window.LuviaDestination.getActive?.());target=destination(resolved)}
 if(!target?.location)throw new Error('Das aktive Reiseziel konnte nicht geografisch aufgelöst werden.');
 const radius=Math.max(10000,Math.min(200000,Number(options.radiusMeters)||target.searchRadiusMeters||100000));
 return call('cycling.search',{query:clean(query),profile:clean(options.profile||'all'),radiusMeters:radius,maxResultCount:Number(options.maxResultCount)||30,destination:target},{timeoutMs:Number(options.timeoutMs)||9500});
}
async function details(route,options={}){const data=route?.routeData||{},osmType=clean(options.osmType||data.osmType),osmId=clean(options.osmId||data.osmId);if(!osmType||!osmId)throw new Error('OpenStreetMap-Routenreferenz fehlt.');return call('cycling.details',{osmType,osmId,providerPlace:route,destinationName:destination(options.destination)?.displayName||''},{timeoutMs:Number(options.timeoutMs)||10000});}
async function health(){return call('cycling.health',{}, {timeoutMs:5000})}
function diagnostics(){return{version:VERSION,status:window.LuviaBackend?'ready':'degraded',providers:{discovery:'openstreetmap-overpass',approachRouting:'google-routes-bicycle'},performance:{searchTimeoutMs:9500,cacheTtlMs:CACHE_TTL,defaultRadiusMeters:100000,maxRadiusMeters:200000},metrics:{requests:state.requests,successes:state.successes,failures:state.failures,cacheHits:state.cacheHits,cacheEntries:state.cache.size},lastError:state.lastError,lastResult:state.lastResult}}
window.LuviaCyclingRoutes=Object.freeze({version:VERSION,search,details,health,diagnostics});
})();
