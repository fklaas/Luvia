(function(){
'use strict';

const VERSION='4.12.0';
const CACHE_TTL=10*60_000;
const SEARCH_TIMEOUT_MS=7600;
const state={requests:0,successes:0,failures:0,cacheHits:0,lastError:null,lastResult:null,cache:new Map()};
const clean=value=>String(value??'').trim();

function destination(input){
  const raw=input||window.LuviaDestination?.getActive?.()||null;
  if(!raw)return null;
  const center=raw.location||raw.center||raw.coordinates||raw.canonicalCity?.center||null;
  return{
    id:raw.id||null,
    name:raw.name||raw.displayName||raw.canonicalCity?.name||'',
    displayName:raw.displayName||raw.name||raw.canonicalCity?.name||'',
    countryCode:raw.countryCode||raw.country?.code||'',
    location:center?{latitude:Number(center.latitude??center.lat),longitude:Number(center.longitude??center.lng)}:null,
    searchRadiusMeters:Number(raw.searchRadiusMeters)||150000
  };
}

function recommendedRadius(profile='all'){
  return({mtb:200000,gravel:150000,city:60000,family:75000,touring:120000,all:150000})[clean(profile).toLowerCase()]||150000;
}

function cacheKey(action,payload){return`${action}:${JSON.stringify(payload)}`;}
function fromCache(key){
  const item=state.cache.get(key);
  if(!item)return null;
  if(item.expires<Date.now()){state.cache.delete(key);return null;}
  state.cacheHits++;
  return item.value;
}
function remember(key,value){state.cache.set(key,{expires:Date.now()+CACHE_TTL,value});return value;}
function cacheable(action){return action.startsWith('cycling.search');}

async function call(action,payload={},options={}){
  const key=cacheKey(action,payload);
  const hit=cacheable(action)?fromCache(key):null;
  if(hit)return hit;
  state.requests++;
  try{
    const response=await window.LuviaBackend.request(action,payload,{timeoutMs:Number(options.timeoutMs)||SEARCH_TIMEOUT_MS});
    state.successes++;
    state.lastError=null;
    state.lastResult=response?.data||null;
    return cacheable(action)?remember(key,response):response;
  }catch(error){
    state.failures++;
    state.lastError={code:error.code||'CYCLING_REQUEST_FAILED',message:error.message||String(error),action,at:new Date().toISOString()};
    throw error;
  }
}

async function resolvedTarget(options={}){
  let target=destination(options.destination);
  if(!target?.location&&window.LuviaDestination?.ensureResolved){
    const resolved=await window.LuviaDestination.ensureResolved(options.destination||window.LuviaDestination.getActive?.());
    target=destination(resolved);
  }
  if(!target?.location)throw new Error('Das aktive Reiseziel konnte nicht geografisch aufgelöst werden.');
  return target;
}

function searchPayload(query,target,options={}){
  const profile=clean(options.profile||'all').toLowerCase()||'all';
  const radius=Math.max(10000,Math.min(300000,Number(options.radiusMeters)||recommendedRadius(profile)||target.searchRadiusMeters||150000));
  return{
    query:clean(query),
    profile,
    radiusMeters:radius,
    maxResultCount:Number(options.maxResultCount)||36,
    destination:target
  };
}

async function searchStage(action,query='',options={}){
  const target=await resolvedTarget(options);
  return call(action,searchPayload(query,target,options),{timeoutMs:Number(options.timeoutMs)||SEARCH_TIMEOUT_MS});
}

async function searchRoutes(query='',options={}){
  return searchStage('cycling.search.routes',query,options);
}

async function searchTrailforks(query='',options={}){
  return searchStage('cycling.search.trailforks',query,{...options,timeoutMs:Number(options.timeoutMs)||7600});
}

async function searchTrails(query='',options={}){
  return searchStage('cycling.search.trails',query,options);
}

async function searchGenerated(query='',options={}){
  const target=await resolvedTarget(options);
  const payload=searchPayload(query,target,options);
  if(options.anchor?.latitude!=null&&options.anchor?.longitude!=null)payload.anchor={latitude:Number(options.anchor.latitude),longitude:Number(options.anchor.longitude)};
  payload.maxGeneratedResultCount=Math.max(1,Math.min(4,Number(options.maxGeneratedResultCount)||4));
  return call('cycling.search.generated',payload,{timeoutMs:Number(options.timeoutMs)||11000});
}

function providerId(value={}){return String(value.providerPlaceId||value.provider_place_id||value.id||'');}
function mergeResponses(responses=[],max=36){
  const byId=new Map();
  for(const response of responses){
    for(const route of response?.data?.routes||[]){
      const id=providerId(route);
      if(id)byId.set(id,{...(byId.get(id)||{}),...route});
    }
  }
  const routes=[...byId.values()].sort((a,b)=>Number(b.routeData?.qualityScore||b.matchScore||0)-Number(a.routeData?.qualityScore||a.matchScore||0));
  return routes.slice(0,max);
}

async function search(query='',options={}){
  const [trailforks,generated,routes,trails]=await Promise.allSettled([
    searchTrailforks(query,options),
    searchGenerated(query,options),
    searchRoutes(query,options),
    searchTrails(query,options)
  ]);
  const successful=[trailforks,generated,routes,trails].filter(item=>item.status==='fulfilled').map(item=>item.value);
  if(!successful.length)throw generated.reason||routes.reason||trails.reason||new Error('Fahrradrouten konnten nicht geladen werden.');
  const merged=mergeResponses(successful,Number(options.maxResultCount)||36);
  return{
    ok:true,
    data:{
      routes:merged,
      provider:'hybrid-cycling',
      stage:'combined-client',
      warning:successful.map(response=>response?.data?.warning).filter(Boolean).join(' ')||null,
      stages:{trailforks:trailforks.status==='fulfilled'?trailforks.value?.data?.summary:null,generated:generated.status==='fulfilled'?generated.value?.data?.summary:null,routes:routes.status==='fulfilled'?routes.value?.data?.summary:null,trails:trails.status==='fulfilled'?trails.value?.data?.summary:null}
    }
  };
}

async function details(route,options={}){
  const data=route?.routeData||{};
  const osmType=clean(options.osmType||data.osmType);
  const osmId=clean(options.osmId||data.osmId);
  if(!['relation','way'].includes(osmType)||!/^\d+$/.test(osmId))throw new Error('Für dieses Trailgebiet gibt es keine einzelne ladbare OSM-Route.');
  return call('cycling.details',{osmType,osmId,providerPlace:route,destinationName:destination(options.destination)?.displayName||''},{timeoutMs:Number(options.timeoutMs)||10000});
}

async function health(){return call('cycling.health',{}, {timeoutMs:5000});}

function clearSearchCache(){
  for(const key of [...state.cache.keys()])if(key.startsWith('cycling.search'))state.cache.delete(key);
}

function diagnostics(){
  return{
    version:VERSION,
    status:window.LuviaBackend?'ready':'degraded',
    providers:{curatedMtbTrails:'trailforks-approved-api',generatedRoundTrips:'openrouteservice',routeRelations:'openstreetmap-overpass',trailFeatures:'openstreetmap-overpass',approachRouting:'google-routes-bicycle'},
    pipeline:{stagedDiscovery:true,actions:['cycling.search.trailforks','cycling.search.generated','cycling.search.routes','cycling.search.trails'],generatedRoundTrips:true,broadenWhenExactEmpty:true,unnamedTrailClustering:true},
    performance:{searchTimeoutMs:SEARCH_TIMEOUT_MS,cacheTtlMs:CACHE_TTL,defaultRadiusMeters:150000,recommendedMtbRadiusMeters:200000,maxRadiusMeters:300000},
    metrics:{requests:state.requests,successes:state.successes,failures:state.failures,cacheHits:state.cacheHits,cacheEntries:state.cache.size},
    lastError:state.lastError,
    lastResult:state.lastResult
  };
}

window.LuviaCyclingRoutes=Object.freeze({version:VERSION,search,searchTrailforks,searchGenerated,searchRoutes,searchTrails,details,health,recommendedRadius,clearSearchCache,diagnostics});
})();
