(() => {
'use strict';
const VERSION='4.7.0';
let state={tripId:null,loading:false,records:[],lastUpdatedAt:null,lastError:null};
let channel=null; const listeners=new Set();
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const canonicalUuid=v=>UUID_RE.test(String(v||'').trim())?String(v).trim():null;
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
  state.records=(data||[]).map(normalize);for(const rec of state.records)window.LuviaPlaceRuntime?.setData?.({tripId:id,placeType:rec.place_type,tripPlaceId:rec.trip_place_id,data:rec});state.lastUpdatedAt=new Date().toISOString();emit();return snapshot()
 }catch(error){state.lastError=error.message;emit();throw error}
 finally{state.loading=false}
}
function recordForTripPlace(id){return state.records.find(r=>String(r.trip_place_id)===String(id))||null}
function recordsForType(type){return state.records.filter(r=>String(r.place_type)===String(type))}
async function upsert({tripId:id=tripId(),tripPlaceId,placeId,placeType,fields={}}={}){
 if(!id||!tripPlaceId||!placeType)throw new Error('tripId, tripPlaceId und placeType sind erforderlich.');
 const c=db(); if(!c?.rpc)throw new Error('Supabase ist nicht verfügbar.');
 const canonicalPlaceId=canonicalUuid(placeId);
 const {data,error}=await c.rpc('luvia_upsert_trip_place_fields',{p_trip_id:id,p_trip_place_id:tripPlaceId,p_place_id:canonicalPlaceId,p_place_type:placeType,p_fields:fields||{}});
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
const legacyLabels={restaurant:{planned_at:['planned','Restaurant'],reservation_at:['reserved','Reservierung']},accommodation:{check_in_at:['check_in','Check-in'],check_out_at:['check_out','Check-out']}};
function dateEntries(type=null){
 const out=[];
 for(const r of state.records){
  if(type&&r.place_type!==type)continue;
  const contract=window.LuviaPlaceTypeContracts?.get?.(r.place_type);
  const pointLabel=r.place_type==='restaurant'?'Restaurant':r.place_type==='attraction'?'Sehenswürdigkeit':r.place_type==='photo_spot'?'Fotospot':(contract?.identity?.label||'Place');const defs=(contract?.fields||[]).filter(f=>['start','end','point'].includes(f.timelineRole)).map(f=>({key:f.key,kind:f.timelineRole==='start'?'check_in':f.timelineRole==='end'?'check_out':'planned',label:f.timelineRole==='point'?pointLabel:(f.label||pointLabel)}));
  const merged=[...defs];for(const [key,[kind,label]] of Object.entries(legacyLabels[r.place_type]||{}))if(!merged.some(x=>x.key===key))merged.push({key,kind,label});
  for(const d of merged){const value=r.fields?.[d.key];if(!value)continue;out.push({id:`tpd:${r.trip_place_id}:${d.key}`,dataKey:d.key,tripId:r.trip_id,tripPlaceId:r.trip_place_id,placeId:r.place_id,placeType:r.place_type,kind:d.kind,title:`${d.label} · ${r.place?.name||r.fields?.place_name||'Place'}`,startAt:value,fields:r.fields,record:r})}
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
window.LuviaTripPlaceData=Object.freeze({version:VERSION,init,hydrate,snapshot,recordForTripPlace,recordsForType,dateEntries,upsert,replaceFields,remove,updateDateFields,subscribe,subscribeRealtime,canonicalUuid,diagnostics});
})();