(() => {
'use strict';
const VERSION='4.4.6.1';
let state={tripId:null,loading:false,records:[],lastUpdatedAt:null,lastError:null};
let channel=null; const listeners=new Set();
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const db=()=>window.LuviaSupabaseService?.getClient?.()||window.ParisSupabaseClient||window.ParisCloud?.client||null;
const tripId=()=>window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||null;
const emit=()=>{const snap=snapshot();listeners.forEach(fn=>{try{fn(snap)}catch{}});window.dispatchEvent(new CustomEvent('luvia:trip-place-data-changed',{detail:snap}))};
function snapshot(){return clone(state)}
function normalize(row){return {...row,fields:row?.fields&&typeof row.fields==='object'?row.fields:{}}}
async function hydrate(id=tripId()){
 state.tripId=id||null;
 if(!id){state.records=[];state.lastUpdatedAt=new Date().toISOString();emit();return snapshot()}
 const c=db(); if(!c?.from)throw new Error('Supabase ist nicht verfügbar.');
 state.loading=true; state.lastError=null;
 try{
  const {data,error}=await c.from('trip_place_data').select('*,place:places(*),trip_place:trip_places(*)').eq('trip_id',id);
  if(error)throw error;
  state.records=(data||[]).map(normalize);state.lastUpdatedAt=new Date().toISOString();emit();return snapshot()
 }catch(error){state.lastError=error.message;emit();throw error}
 finally{state.loading=false}
}
function recordForTripPlace(id){return state.records.find(r=>String(r.trip_place_id)===String(id))||null}
function recordsForType(type){return state.records.filter(r=>String(r.place_type)===String(type))}
async function upsert({tripId:id=tripId(),tripPlaceId,placeId,placeType,fields={}}={}){
 if(!id||!tripPlaceId||!placeType)throw new Error('tripId, tripPlaceId und placeType sind erforderlich.');
 const c=db(); if(!c?.rpc)throw new Error('Supabase ist nicht verfügbar.');
 const {data,error}=await c.rpc('luvia_upsert_trip_place_fields',{p_trip_id:id,p_trip_place_id:tripPlaceId,p_place_id:placeId||null,p_place_type:placeType,p_fields:fields||{}});
 if(error)throw error;
 await hydrate(id); return data;
}
async function replaceFields({tripId:id=tripId(),tripPlaceId,placeId,placeType,fields={}}={}){
 const c=db(); const payload={trip_id:id,trip_place_id:tripPlaceId,place_id:placeId||null,place_type:placeType,fields,updated_at:new Date().toISOString()};
 const {data,error}=await c.from('trip_place_data').upsert(payload,{onConflict:'trip_place_id'}).select().single();
 if(error)throw error; await hydrate(id); return data;
}
async function remove(tripPlaceId,{tripId:id=tripId()}={}){
 const {error}=await db().from('trip_place_data').delete().eq('trip_id',id).eq('trip_place_id',tripPlaceId);
 if(error)throw error; await hydrate(id); return true;
}
const dateDefs={
 accommodation:[
  {key:'check_in_at',kind:'check_in',label:'Check-in'},
  {key:'check_out_at',kind:'check_out',label:'Check-out'}
 ],
 restaurant:[
  {key:'planned_at',kind:'planned',label:'Restaurant'},
  {key:'reservation_at',kind:'reserved',label:'Reservierung'}
 ]
};
function dateEntries(type=null){
 const out=[];
 for(const r of state.records){
  if(type&&r.place_type!==type)continue;
  const defs=dateDefs[r.place_type]||[];
  for(const d of defs){
   const value=r.fields?.[d.key]; if(!value)continue;
   out.push({id:`tpd:${r.trip_place_id}:${d.key}`,dataKey:d.key,tripId:r.trip_id,tripPlaceId:r.trip_place_id,placeId:r.place_id,placeType:r.place_type,kind:d.kind,title:`${d.label} · ${r.place?.name||r.fields?.place_name||'Place'}`,startAt:value,fields:r.fields,record:r});
  }
 }
 return out.sort((a,b)=>new Date(a.startAt)-new Date(b.startAt));
}
async function updateDateFields(tripPlaceId,updates,{tripId:id=tripId()}={}){
 const rec=recordForTripPlace(tripPlaceId); if(!rec)throw new Error('Place-Datensatz wurde nicht gefunden.');
 return upsert({tripId:id,tripPlaceId,placeId:rec.place_id,placeType:rec.place_type,fields:updates});
}
function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
function subscribeRealtime(id=state.tripId||tripId()){
 const c=db(); if(channel){try{c?.removeChannel(channel)}catch{} channel=null}
 if(!c||!id)return false;
 channel=c.channel(`trip-place-data:${id}`).on('postgres_changes',{event:'*',schema:'public',table:'trip_place_data',filter:`trip_id=eq.${id}`},()=>hydrate(id).catch(()=>{})).subscribe();
 return true;
}
async function init(){const id=tripId();await hydrate(id).catch(()=>{});subscribeRealtime(id);return diagnostics()}
function diagnostics(){return{version:VERSION,status:'ready',cloudAuthoritative:true,localPersistence:false,tripId:state.tripId,records:state.records.length,dateEntries:dateEntries().length,realtime:Boolean(channel)}}
window.addEventListener('luvia:trip-changed',e=>{const id=e.detail?.tripId||tripId();hydrate(id).then(()=>subscribeRealtime(id)).catch(()=>{})});
window.LuviaTripPlaceData=Object.freeze({version:VERSION,init,hydrate,snapshot,recordForTripPlace,recordsForType,dateEntries,upsert,replaceFields,remove,updateDateFields,subscribe,subscribeRealtime,diagnostics});
})();