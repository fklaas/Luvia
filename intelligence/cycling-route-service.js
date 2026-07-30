(function(){
'use strict';
const VERSION='4.11.0';
const state={requests:0,successes:0,failures:0,lastError:null,lastResult:null};
const clean=value=>String(value??'').trim();
function destination(input){
 const raw=input||window.LuviaDestination?.getActive?.()||null;if(!raw)return null;
 const center=raw.location||raw.center||raw.coordinates||raw.canonicalCity?.center||null;
 return{id:raw.id||null,name:raw.name||raw.displayName||raw.canonicalCity?.name||'',displayName:raw.displayName||raw.name||raw.canonicalCity?.name||'',countryCode:raw.countryCode||raw.country?.code||'',location:center?{latitude:Number(center.latitude??center.lat),longitude:Number(center.longitude??center.lng)}:null,searchRadiusMeters:Number(raw.searchRadiusMeters)||40000};
}
async function call(action,payload={}){state.requests++;try{const response=await window.LuviaBackend.request(action,payload);state.successes++;state.lastError=null;state.lastResult=response?.data||null;return response}catch(error){state.failures++;state.lastError={code:error.code||'CYCLING_REQUEST_FAILED',message:error.message||String(error),at:new Date().toISOString()};throw error}}
async function search(query='',options={}){let target=destination(options.destination);if(!target?.location&&window.LuviaDestination?.ensureResolved){const resolved=await window.LuviaDestination.ensureResolved(options.destination||window.LuviaDestination.getActive?.());target=destination(resolved)}if(!target?.location)throw new Error('Das aktive Reiseziel konnte nicht geografisch aufgelöst werden.');return call('cycling.search',{query:clean(query),profile:clean(options.profile||'all'),radiusMeters:Number(options.radiusMeters)||target.searchRadiusMeters||40000,maxResultCount:Number(options.maxResultCount)||24,destination:target});}
async function details(route,options={}){const data=route?.routeData||{},osmType=clean(options.osmType||data.osmType),osmId=clean(options.osmId||data.osmId);if(!osmType||!osmId)throw new Error('OpenStreetMap-Routenreferenz fehlt.');return call('cycling.details',{osmType,osmId,providerPlace:route,destinationName:destination(options.destination)?.displayName||''});}
async function health(){return call('cycling.health',{})}
function diagnostics(){return{version:VERSION,status:window.LuviaBackend?'ready':'degraded',providers:{discovery:'openstreetmap-overpass',approachRouting:'google-routes-bicycle'},metrics:{requests:state.requests,successes:state.successes,failures:state.failures},lastError:state.lastError,lastResult:state.lastResult}}
window.LuviaCyclingRoutes=Object.freeze({version:VERSION,search,details,health,diagnostics});
})();
