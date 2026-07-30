(()=>{
'use strict';
const VERSION='4.6.8';
const CANONICAL=new Set(['idea','discovered','saved','favorite','planned','reserved','selected','booked','checked_in','checked_out','visited','rated','rejected','archived']);
const MAP={favorited:'favorite',dismissed:'rejected',memory:'visited',travel_book:'visited'};
const records=new Map();
const pending=new Map();
const clean=v=>String(v??'').trim();
const activeTripId=v=>clean(v||window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||'');
const normalizeStatus=v=>{const s=MAP[clean(v)]||clean(v)||'idea';return CANONICAL.has(s)?s:'idea'};
const entityLink=e=>e?.tripPlace||e?.trip_place||e?.rawEntity?.tripPlace||e?.rawEntity?.trip_place||{};
const entityPlace=e=>e?.place||e?.rawEntity?.place||e||{};
const providerId=e=>clean(entityPlace(e).providerPlaceId||entityPlace(e).provider_place_id||e?.providerPlaceId||e?.provider_place_id||e?.sourceId||e?.id).replace(/^places\//,'');
const recordKey=(trip,type,provider,tp)=>`${clean(trip)}|${clean(type)}|${clean(tp)||providerId({providerPlaceId:provider})}`;
function remember(placeType,items=[],trip=activeTripId()){
 for(const entity of items||[]){const link=entityLink(entity),provider=providerId(entity),tp=clean(link.id||entity?.tripPlaceId);if(!provider&&!tp)continue;records.set(recordKey(trip,placeType,provider,tp),{tripId:trip,placeType,providerPlaceId:provider,tripPlaceId:tp,isFavorite:link.is_favorite===true||entity?.isFavorite===true,status:normalizeStatus(link.status||link.lifecycle_status||entity?.lifecycleStatus||'idea'),entity});}
}
function findRecord({tripId=activeTripId(),placeType,providerPlaceId,tripPlaceId}={}){
 const exact=records.get(recordKey(tripId,placeType,providerPlaceId,tripPlaceId));if(exact)return exact;
 for(const rec of records.values())if(rec.tripId===clean(tripId)&&rec.placeType===clean(placeType)&&((tripPlaceId&&rec.tripPlaceId===clean(tripPlaceId))||(providerPlaceId&&rec.providerPlaceId===clean(providerPlaceId).replace(/^places\//,''))))return rec;
 return null;
}
function favoriteButton({placeType,providerPlaceId='',tripPlaceId='',isFavorite=false,className='',extra=''}={}){
 const pressed=Boolean(isFavorite);return `<button type="button" class="luv-place-favorite-toggle ${pressed?'is-active':''} ${clean(className)}" data-place-favorite-toggle data-place-type="${clean(placeType)}" data-place-provider-id="${clean(providerPlaceId).replace(/^places\//,'')}" data-place-trip-place-id="${clean(tripPlaceId)}" aria-pressed="${pressed?'true':'false'}" ${extra}>${pressed?'♥ Favorit':'♡ Favorit'}</button>`;
}
function updateButtons({tripId=activeTripId(),placeType,providerPlaceId,tripPlaceId,isFavorite}){
 const selectors=['[data-place-favorite-toggle]','[data-place-favorite-action]'];
 document.querySelectorAll(selectors.join(',')).forEach(button=>{
  const type=clean(button.dataset.placeType||button.closest('[data-place-type]')?.dataset.placeType);if(type&&type!==clean(placeType))return;
  const provider=clean(button.dataset.placeProviderId).replace(/^places\//,'');const tp=clean(button.dataset.placeTripPlaceId);
  if(providerPlaceId&&provider&&provider!==clean(providerPlaceId).replace(/^places\//,''))return;
  if(tripPlaceId&&tp&&tp!==clean(tripPlaceId))return;
  if(!provider&&!tp)return;
  button.disabled=false;button.classList.toggle('is-active',Boolean(isFavorite));button.setAttribute('aria-pressed',isFavorite?'true':'false');button.textContent=isFavorite?'♥ Favorit':'♡ Favorit';
 });
}
async function refresh(id,type,detail={}){
 const payload={tripId:id,placeType:type,...detail};
 window.dispatchEvent(new CustomEvent('luvia:place-favorite-changed',{detail:payload}));
 window.dispatchEvent(new CustomEvent('luvia:place-collection-changed',{detail:payload}));
 window.dispatchEvent(new CustomEvent('luvia:in-window-data-changed',{detail:payload}));
}
async function ensureLinked({tripId:id=activeTripId(),placeType,providerPlaceId,tripPlaceId,entity,extension={}}={}){
 const known=findRecord({tripId:id,placeType,providerPlaceId,tripPlaceId});if(known?.tripPlaceId)return {...known,entity:known.entity||entity};
 if(tripPlaceId)return {tripPlaceId:clean(tripPlaceId),providerPlaceId:clean(providerPlaceId),entity};
 if(!providerPlaceId)throw new Error('Place-ID fehlt.');
 const response=await window.LuviaPlaceEntities.importPlace(providerPlaceId,{tripId:id,type:placeType,tripPlace:{status:'idea',isFavorite:false},extension});
 const imported=response?.data?.entity||response?.data?.tripPlaceEntity||response?.data||response||{};const linked=entityLink(imported);const rec={tripId:id,placeType,providerPlaceId:providerId(imported)||clean(providerPlaceId),tripPlaceId:clean(linked.id||imported?.tripPlaceId),isFavorite:false,status:normalizeStatus(linked.status||linked.lifecycle_status||'idea'),entity:imported};
 if(!rec.tripPlaceId)throw new Error('Place-Verknüpfung konnte nicht angelegt werden.');records.set(recordKey(id,placeType,rec.providerPlaceId,rec.tripPlaceId),rec);return rec;
}
async function setFavorite({tripId:id=activeTripId(),placeType,providerPlaceId,tripPlaceId,entity,isFavorite,status,extension={}}={}){
 id=activeTripId(id);placeType=clean(placeType);if(!id||!placeType)throw new Error('Reise und Place-Typ sind erforderlich.');
 const ensured=await ensureLinked({tripId:id,placeType,providerPlaceId,tripPlaceId,entity,extension});const rec=findRecord({tripId:id,placeType,providerPlaceId:ensured.providerPlaceId,tripPlaceId:ensured.tripPlaceId})||ensured;
 const next=typeof isFavorite==='boolean'?isFavorite:!Boolean(rec.isFavorite);const currentStatus=normalizeStatus(status||rec.status||entityLink(rec.entity).status||entityLink(rec.entity).lifecycle_status||'idea');const nextStatus=next&&['idea','discovered','saved'].includes(currentStatus)?'favorite':(!next&&currentStatus==='favorite'?'discovered':currentStatus);
 const key=`${id}|${placeType}|${rec.tripPlaceId}`;if(pending.has(key))return pending.get(key);
 updateButtons({tripId:id,placeType,providerPlaceId:rec.providerPlaceId,tripPlaceId:rec.tripPlaceId,isFavorite:next});
 const task=(async()=>{try{const response=await window.LuviaPlaceEntities.updateLifecycle(rec.tripPlaceId,nextStatus,{isFavorite:next},{tripId:id});const updated=response?.data?.entity||response?.data||rec.entity;const link=entityLink(updated);const finalRec={...rec,entity:updated,isFavorite:next,status:normalizeStatus(link.status||link.lifecycle_status||nextStatus),providerPlaceId:providerId(updated)||rec.providerPlaceId};records.set(recordKey(id,placeType,finalRec.providerPlaceId,finalRec.tripPlaceId),finalRec);await refresh(id,placeType,{action:next?'favorite-added':'favorite-removed',tripPlaceId:finalRec.tripPlaceId,providerPlaceId:finalRec.providerPlaceId,isFavorite:next,entity:updated});return response}catch(error){updateButtons({tripId:id,placeType,providerPlaceId:rec.providerPlaceId,tripPlaceId:rec.tripPlaceId,isFavorite:rec.isFavorite});throw error}finally{pending.delete(key)}})();pending.set(key,task);return task;
}
async function toggleFavorite(options={}){const rec=findRecord(options);return setFavorite({...options,isFavorite:typeof options.isFavorite==='boolean'?options.isFavorite:!Boolean(rec?.isFavorite)});}
async function clearFavorites(placeType,{tripId:id=activeTripId(),tripPlaceIds=[],entities=[]}={}){
 id=activeTripId(id);placeType=clean(placeType);if(!id||!placeType)throw new Error('Reise und Place-Typ sind erforderlich.');remember(placeType,entities,id);
 let ids=[...new Set((tripPlaceIds||[]).map(clean).filter(Boolean))];if(!ids.length)ids=[...records.values()].filter(r=>r.tripId===id&&r.placeType===placeType&&r.isFavorite).map(r=>r.tripPlaceId).filter(Boolean);
 if(!ids.length)return 0;
 const targets=ids.map(tp=>findRecord({tripId:id,placeType,tripPlaceId:tp})||{tripId:id,placeType,tripPlaceId:tp,providerPlaceId:'',isFavorite:true,status:'favorite'});
 targets.forEach(r=>updateButtons({...r,isFavorite:false}));
 const results=await Promise.allSettled(targets.map(r=>setFavorite({...r,isFavorite:false})));
 const failed=results.filter(r=>r.status==='rejected');if(failed.length)throw failed[0].reason||new Error('Favoriten konnten nicht vollständig entfernt werden.');
 await refresh(id,placeType,{action:'favorites-cleared',clearedTripPlaceIds:ids,providerPlaceIds:targets.map(r=>r.providerPlaceId).filter(Boolean),isFavorite:false});return ids.length;
}
async function saveDateFields({tripId:id=activeTripId(),placeType,tripPlaceId,placeId,fields}={}){const result=await window.LuviaTripPlaceData.upsert({tripId:id,tripPlaceId,placeId,placeType,fields});await refresh(id,placeType);return result;}
function favoritePanel({items=[],title='Lieblingsorte',empty='Noch keine Favoriten',renderCard,placeType='',clearAttr='',open=false}={}){
 remember(placeType,items);const cards=items.map(renderCard).join('');const tripPlaceIds=[...new Set(items.map(e=>clean(entityLink(e).id||e?.tripPlaceId)).filter(Boolean))];
 return `<details class="rv2-library-panel rv2-library-favorites"${open?' open':''}><summary><span><i>♥</i><span><strong>${title}</strong><small>${items.length?`${items.length} für eure Reise`:empty}</small></span></span><span class="rv2-library-summary-actions">${items.length?`<button type="button" class="rv2-clear-all" data-place-clear-favorites="${clean(placeType)}" data-place-favorite-trip-ids="${tripPlaceIds.join(',')}" ${clearAttr}>Alle entfernen</button>`:''}<b>${items.length}</b></span></summary><div class="rv2-library-content">${items.length?`<div class="rv2-grid rv2-saved-grid">${cards}</div>`:`<div class="rv2-library-empty">${empty}</div>`}</div></details>`;
}
if(!window.__LUVIA_GLOBAL_FAVORITES_BOUND__){
 window.__LUVIA_GLOBAL_FAVORITES_BOUND__=true;
 document.addEventListener('click',async event=>{
  const toggle=event.target.closest?.('[data-place-favorite-toggle]');
  if(toggle){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(toggle.disabled)return;const old=toggle.textContent;toggle.disabled=true;toggle.textContent='Wird gespeichert …';try{await toggleFavorite({tripId:activeTripId(),placeType:toggle.dataset.placeType,providerPlaceId:toggle.dataset.placeProviderId,tripPlaceId:toggle.dataset.placeTripPlaceId});window.LuviaUIKit?.toast?.(toggle.getAttribute('aria-pressed')==='true'?'Als Favorit gespeichert.':'Aus Favoriten entfernt.',{type:'success'});}catch(error){toggle.disabled=false;toggle.textContent=old;window.LuviaUIKit?.toast?.(error.message||'Favorit konnte nicht geändert werden.',{type:'error'});}return;}
  const button=event.target.closest?.('[data-place-clear-favorites]');if(!button)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(button.disabled)return;const type=clean(button.dataset.placeClearFavorites),ids=clean(button.dataset.placeFavoriteTripIds).split(',').filter(Boolean),old=button.textContent;button.disabled=true;button.textContent='Wird entfernt …';try{await clearFavorites(type,{tripId:activeTripId(),tripPlaceIds:ids});window.LuviaUIKit?.toast?.('Alle Favoriten wurden entfernt.',{type:'success'});}catch(error){button.disabled=false;button.textContent=old;window.LuviaUIKit?.toast?.(error.message||'Favoriten konnten nicht entfernt werden.',{type:'error'});}},true);
}
function diagnostics(){return{version:VERSION,status:'ready',cloudAuthoritative:true,singleWriter:true,registered:records.size,pending:pending.size,contracts:['one-global-favorite-toggle','one-global-clear-action','canonical-trip-place-id','optimistic-global-state','cross-card-synchronization','favorite-removal-from-mini-cards','no-module-specific-favorite-writes']}}
window.LuviaPlaceCollections=Object.freeze({version:VERSION,normalizeStatus,remember,findRecord,favoriteButton,setFavorite,toggleFavorite,clearFavorites,saveDateFields,favoritePanel,refresh,diagnostics});
})();
