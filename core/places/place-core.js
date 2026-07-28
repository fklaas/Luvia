(function(){
'use strict';
const VERSION='4.0.3';
const records=new Map();
const metrics={registered:0,updated:0,removed:0,normalized:0,restaurantNormalized:0,invalid:0,lastError:null};
const D=()=>window.LuviaPlaceDomain,R=()=>window.LuviaPlaceRegistry;
function put(place){const check=D().validate(place);if(!check.valid){metrics.invalid++;throw new Error('Ungültiger Place: '+check.errors.join(', '));}records.set(place.id,place);metrics.registered=records.size;return place;}
function normalizePlace(sourceData,options={}){const type=options.primaryType||sourceData?.primaryType||'custom',adapter=R().getAdapter(type);if(!adapter)throw new Error('Kein Adapter für '+type);try{const place=adapter.normalize(sourceData,options);metrics.normalized++;if(type==='restaurant')metrics.restaurantNormalized++;return place;}catch(error){metrics.lastError=error.message;throw error;}}
function registerPlace(input,options={}){return put(options.normalized?input:normalizePlace(input,options));}
function updatePlace(id,patch={}){const current=records.get(id);if(!current)return null;const next=D().normalize({...current,...patch,id,createdAt:current.createdAt,updatedAt:new Date().toISOString()},{primaryType:patch.primaryType||current.primaryType});records.set(id,next);metrics.updated++;return next;}
function removePlace(id){const result=records.delete(id);if(result)metrics.removed++;metrics.registered=records.size;return result;}
function getPlaces(filters={}){return[...records.values()].filter(p=>(!filters.tripId||p.tripId===filters.tripId)&&(!filters.primaryType||p.primaryType===filters.primaryType)&&(!filters.role||p.roles.includes(filters.role))&&(!filters.lifecycle||p.lifecycle===filters.lifecycle));}
async function hydrateType(type,context={}){const adapter=R().getAdapter(type);if(!adapter?.load)return[];const items=await adapter.load(context);items.forEach(put);return items;}
async function init(context={}){const tripId=context.tripId||window.LuviaTripContext?.getActiveTrip?.()?.tripId||null;try{await hydrateType('restaurant',{tripId});}catch(error){metrics.lastError=error.message;window.LuviaKernelLogger?.warn?.('place-core','Restaurant-Hydration wurde übersprungen',{error:error.message});}return diagnostics();}
function updateLifecycle(id,value){return updatePlace(id,{lifecycle:D().lifecycle(value)});}
function prepared(name){return async function(){return{state:'prepared',method:name,delegated:false,reason:`${name} ist als kontrollierter Erweiterungspunkt registriert und wird in einem Folgebuild an den zuständigen Core delegiert.`};};}
function diagnostics(){const registry=R().diagnostics();return{version:VERSION,status:'ready',placeCount:records.size,metrics:{...metrics},registry,ui:window.LuviaPlaceUI?.diagnostics?.()||{status:'not_loaded'},timeline:window.LuviaTimelineCore?.diagnostics?.()||{status:'not_loaded'},presence:window.LuviaPresenceVisitCore?.diagnostics?.()||{status:'not_loaded'},restaurantCompatibility:{active:true,normalized:metrics.restaurantNormalized,failed:metrics.invalid,mapping:'restaurant entity → adapter → universal place'}};}
const api={version:VERSION,init,getPlace:id=>records.get(id)||null,getPlaces,registerPlace,updatePlace,removePlace,normalizePlace,getPlaceTypes:()=>R().getTypes(),getPlaceRoles:id=>records.get(id)?.roles||[],hasRole:(id,role)=>records.get(id)?.roles?.includes(role)||false,getCapabilities:id=>{const p=records.get(id);return p?.capabilities||[];},updateLifecycle,hydrateType,getRecommendations:prepared('getRecommendations'),getNearby:prepared('getNearby'),getAlternatives:prepared('getAlternatives'),getNextBest:prepared('getNextBest'),recordVisit:(placeId,patch={})=>window.LuviaPresenceVisitCore?.confirmVisit?.(placeId,patch)||Promise.resolve({state:'unavailable',reason:'Presence & Visit Core ist nicht geladen.'}),diagnostics};
window.LuviaPlaceCore=window.LuviaPlacesCore=Object.freeze(api);
})();
