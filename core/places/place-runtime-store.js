(()=>{
'use strict';
const VERSION='4.13.0';
const clean=v=>String(v??'').trim();
const normalizeProvider=v=>clean(v).replace(/^places\//,'');
const listeners=new Set();
let activeTripId='';
const trips=new Map();
const tripBucket=id=>{id=clean(id);if(!trips.has(id))trips.set(id,{revision:0,types:new Map(),updatedAt:0});return trips.get(id)};
const typeBucket=(id,type)=>{const trip=tripBucket(id);type=clean(type);if(!trip.types.has(type))trip.types.set(type,{byTripPlaceId:new Map(),byProviderId:new Map(),dataByTripPlaceId:new Map()});return trip.types.get(type)};
const linkOf=e=>e?.tripPlace||e?.trip_place||e?.rawEntity?.tripPlace||e?.rawEntity?.trip_place||{};
const placeOf=e=>e?.place||e?.rawEntity?.place||e||{};
const normalizeEntity=(entity,{tripId=activeTripId,placeType=''}={})=>{const link=linkOf(entity),place=placeOf(entity);const providerPlaceId=normalizeProvider(place.providerPlaceId||place.provider_place_id||entity?.providerPlaceId||entity?.provider_place_id||entity?.sourceId||place.id);const tripPlaceId=clean(link.id||entity?.tripPlaceId);return{tripId:clean(tripId),placeType:clean(placeType||link.type||entity?.type),tripPlaceId,providerPlaceId,placeId:clean(place.id||entity?.placeId||link.place_id),isFavorite:link.is_favorite===true||link.isFavorite===true||entity?.is_favorite===true||entity?.isFavorite===true,status:clean(link.status||link.lifecycle_status||entity?.lifecycleStatus||'idea'),entity};};
function emit(detail){const id=clean(detail.tripId||activeTripId),bucket=tripBucket(id);bucket.revision++;bucket.updatedAt=Date.now();const payload={version:VERSION,tripId:id,revision:bucket.revision,...detail};listeners.forEach(fn=>{try{fn(payload)}catch(e){console.error('[Luvia Place Runtime] subscriber failed',e)}});window.dispatchEvent(new CustomEvent('luvia:place-runtime-changed',{detail:payload}));return payload}
function setActiveTrip(id,{resetForeign=false}={}){id=clean(id);if(!id)return snapshot();const previous=activeTripId;activeTripId=id;tripBucket(id);if(resetForeign&&previous&&previous!==id)trips.delete(previous);emit({action:'active-trip',previousTripId:previous});return snapshot()}
function ingest(placeType,items=[],tripId=activeTripId){const bucket=typeBucket(tripId,placeType);for(const raw of items||[]){const rec=normalizeEntity(raw,{tripId,placeType});if(!rec.tripPlaceId&&!rec.providerPlaceId)continue;if(rec.tripPlaceId)bucket.byTripPlaceId.set(rec.tripPlaceId,rec);if(rec.providerPlaceId)bucket.byProviderId.set(rec.providerPlaceId,rec);}emit({tripId,placeType,action:'ingest',count:(items||[]).length});return records(placeType,tripId)}
function upsert(rec){rec=normalizeEntity(rec.entity||rec,rec);const bucket=typeBucket(rec.tripId||activeTripId,rec.placeType);if(rec.tripPlaceId)bucket.byTripPlaceId.set(rec.tripPlaceId,rec);if(rec.providerPlaceId)bucket.byProviderId.set(rec.providerPlaceId,rec);emit({tripId:rec.tripId||activeTripId,placeType:rec.placeType,action:'upsert',tripPlaceId:rec.tripPlaceId,providerPlaceId:rec.providerPlaceId,isFavorite:rec.isFavorite});return rec}
function patch(query,changes={}){const rec=find(query);if(!rec)return null;const next={...rec,...changes,entity:changes.entity||rec.entity};const link=linkOf(next.entity);if(next.entity&&link){if(typeof changes.isFavorite==='boolean'){link.is_favorite=changes.isFavorite;link.isFavorite=changes.isFavorite}if(changes.status){link.status=changes.status;link.lifecycle_status=changes.status}}return upsert(next)}
function find({tripId=activeTripId,placeType,tripPlaceId,providerPlaceId}={}){const bucket=typeBucket(tripId,placeType);return (tripPlaceId&&bucket.byTripPlaceId.get(clean(tripPlaceId)))||(providerPlaceId&&bucket.byProviderId.get(normalizeProvider(providerPlaceId)))||null}
function records(placeType,tripId=activeTripId){const bucket=typeBucket(tripId,placeType),seen=new Set(),out=[];for(const rec of bucket.byTripPlaceId.values()){out.push(rec);seen.add(rec.providerPlaceId)}for(const rec of bucket.byProviderId.values())if(!seen.has(rec.providerPlaceId))out.push(rec);return out}
function favorites(placeType,tripId=activeTripId){return records(placeType,tripId).filter(r=>r.isFavorite)}
function setData({tripId=activeTripId,placeType,tripPlaceId,data}){if(!tripPlaceId)return;typeBucket(tripId,placeType).dataByTripPlaceId.set(clean(tripPlaceId),data);emit({tripId,placeType,tripPlaceId,action:'data'});}
function getData({tripId=activeTripId,placeType,tripPlaceId}){return typeBucket(tripId,placeType).dataByTripPlaceId.get(clean(tripPlaceId))||null}
function clearTrip(id){id=clean(id);trips.delete(id);if(activeTripId===id)activeTripId='';emit({tripId:id,action:'clear-trip'})}
function snapshot(id=activeTripId){const trip=tripBucket(id),types={};for(const [type,bucket] of trip.types){types[type]={records:records(type,id),favorites:favorites(type,id),data:[...bucket.dataByTripPlaceId.entries()]}}return{version:VERSION,activeTripId:id,revision:trip.revision,updatedAt:trip.updatedAt,types}}
function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
window.addEventListener('luvia:trip-changed',e=>{const id=e.detail?.tripId||e.detail?.trip?.tripId;if(id)setActiveTrip(id)});
window.LuviaPlaceRuntime=Object.freeze({version:VERSION,setActiveTrip,ingest,upsert,patch,find,records,favorites,setData,getData,clearTrip,snapshot,subscribe,normalizeEntity,diagnostics:()=>({version:VERSION,status:'ready',singleSnapshot:true,activeTripId,trips:trips.size,subscribers:listeners.size})});
})();
