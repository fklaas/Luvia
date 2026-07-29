(()=>{
'use strict';
const VERSION='4.4.6.3';
const CANONICAL=new Set(['idea','discovered','saved','favorite','planned','reserved','selected','booked','checked_in','checked_out','visited','rated','rejected','archived']);
const MAP={favorited:'favorite',dismissed:'rejected',memory:'visited',travel_book:'visited'};
const clean=v=>String(v??'').trim();
const tripId=v=>clean(v||window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||'');
const normalizeStatus=v=>{const s=MAP[clean(v)]||clean(v)||'idea';return CANONICAL.has(s)?s:'idea'};
const entityLink=e=>e?.tripPlace||e?.trip_place||e?.rawEntity?.tripPlace||{};
const entityPlace=e=>e?.place||e?.rawEntity?.place||e||{};
async function refresh(id,type){
 await window.LuviaTripPlaceData?.hydrate?.(id).catch(()=>{});
 await window.LuviaTimelineCore?.hydrate?.(id).catch(()=>{});
 window.dispatchEvent(new CustomEvent('luvia:place-collection-changed',{detail:{tripId:id,placeType:type}}));
 window.dispatchEvent(new CustomEvent('luvia:in-window-data-changed',{detail:{tripId:id,placeType:type}}));
}
async function ensureLinked({tripId:id=tripId(),placeType,providerPlaceId,tripPlaceId,entity,extension={}}={}){
 if(tripPlaceId)return {tripPlaceId,entity};
 const response=await window.LuviaPlaceEntities.importPlace(providerPlaceId,{tripId:id,type:placeType,tripPlace:{status:'idea',isFavorite:false},extension});
 const imported=response?.data?.entity||response?.data;
 const linked=entityLink(imported);
 return {tripPlaceId:linked.id||imported?.tripPlace?.id||null,entity:imported};
}
async function setFavorite({tripId:id=tripId(),placeType,providerPlaceId,tripPlaceId,entity,isFavorite=true,status,extension={}}={}){
 if(!id||!placeType)throw new Error('Reise und Place-Typ sind erforderlich.');
 const ensured=await ensureLinked({tripId:id,placeType,providerPlaceId,tripPlaceId,entity,extension});
 const link=entityLink(ensured.entity||entity);
 const tpId=ensured.tripPlaceId||link.id;
 if(!tpId)throw new Error('Place-Verknüpfung konnte nicht angelegt werden.');
 const nextStatus=normalizeStatus(status||link.status||link.lifecycle_status||'idea');
 const response=await window.LuviaPlaceEntities.updateLifecycle(tpId,nextStatus,{isFavorite:Boolean(isFavorite)},{tripId:id});
 await refresh(id,placeType);
 return response;
}
async function clearFavorites(placeType,{tripId:id=tripId()}={}){
 const response=await window.LuviaPlaceEntities.list({tripId:id,type:placeType});
 const entities=response?.data?.entities||[];
 const favorites=entities.filter(e=>entityLink(e).is_favorite===true);
 for(const e of favorites){const l=entityLink(e);await window.LuviaPlaceEntities.updateLifecycle(l.id,normalizeStatus(l.status||l.lifecycle_status||'idea'),{isFavorite:false},{tripId:id});}
 await refresh(id,placeType);return favorites.length;
}
async function saveDateFields({tripId:id=tripId(),placeType,tripPlaceId,placeId,fields}={}){
 const result=await window.LuviaTripPlaceData.upsert({tripId:id,tripPlaceId,placeId,placeType,fields});
 await refresh(id,placeType);return result;
}
function favoritePanel({items=[],title='Lieblingsorte',empty='Noch keine Favoriten',renderCard,clearAttr='data-place-clear-favorites',open=false}={}){
 const cards=items.map(renderCard).join('');
 return `<details class="rv2-library-panel rv2-library-favorites"${open?' open':''}><summary><span><i>♥</i><span><strong>${title}</strong><small>${items.length?`${items.length} für eure Reise`:empty}</small></span></span><span class="rv2-library-summary-actions">${items.length?`<button type="button" class="rv2-clear-all" ${clearAttr}>Alle entfernen</button>`:''}<b>${items.length}</b></span></summary><div class="rv2-library-content">${items.length?`<div class="rv2-grid rv2-saved-grid">${cards}</div>`:`<div class="rv2-library-empty">${empty}</div>`}</div></details>`;
}
function diagnostics(){return{version:VERSION,status:'ready',cloudAuthoritative:true,contracts:['canonical-lifecycle','favorite-toggle','clear-favorites','trip-place-data-planning','live-refresh','shared-collection-shell','favorites-only','collapsed-by-default']}}
window.LuviaPlaceCollections=Object.freeze({version:VERSION,normalizeStatus,setFavorite,clearFavorites,saveDateFields,favoritePanel,refresh,diagnostics});
})();
