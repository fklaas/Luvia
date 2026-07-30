(()=>{
'use strict';
const VERSION='4.9.0';
const clean=v=>String(v??'').trim();
const tripId=v=>clean(v||window.LuviaPlaceRuntime?.snapshot?.().activeTripId||window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId);
const pending=new Map();
const key=(name,o)=>`${name}|${tripId(o.tripId)}|${clean(o.placeType)}|${clean(o.tripPlaceId||o.providerPlaceId)}`;
async function once(name,options,worker){const k=key(name,options);if(pending.has(k))return pending.get(k);const p=Promise.resolve().then(worker).finally(()=>pending.delete(k));pending.set(k,p);return p}
function favorite(options={}){return once('favorite',options,()=>window.LuviaPlaceCollections.setFavorite({...options,tripId:tripId(options.tripId),isFavorite:true}))}
function unfavorite(options={}){return once('unfavorite',options,()=>window.LuviaPlaceCollections.setFavorite({...options,tripId:tripId(options.tripId),isFavorite:false}))}
function toggleFavorite(options={}){const current=window.LuviaPlaceRuntime?.find?.({...options,tripId:tripId(options.tripId)});const desired=typeof options.isFavorite==='boolean'?options.isFavorite:!Boolean(current?.isFavorite);return desired?favorite(options):unfavorite(options)}
function clearFavorites(placeType,options={}){return once('clear-favorites',{...options,placeType},()=>window.LuviaPlaceCollections.clearFavorites(placeType,{...options,tripId:tripId(options.tripId)}))}
function plan(options={}){return once('plan',options,()=>window.LuviaTripPlaceData.upsert({...options,tripId:tripId(options.tripId)}))}
async function unplan({tripId:id,placeType,tripPlaceId,placeId,fields=[]}={}){const empty=Object.fromEntries((fields||[]).map(f=>[f,null]));return plan({tripId:id,placeType,tripPlaceId,placeId,fields:empty})}
window.LuviaPlaceCommands=Object.freeze({version:VERSION,favorite,unfavorite,toggleFavorite,clearFavorites,plan,unplan,diagnostics:()=>({version:VERSION,status:'ready',singleWriter:true,pending:pending.size,commands:['favorite','unfavorite','toggleFavorite','clearFavorites','plan','unplan']})});
})();
