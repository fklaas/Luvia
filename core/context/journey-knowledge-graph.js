(() => {
'use strict';
const VERSION='4.18.0';
const listeners=new Set();
const cache=new Map();
let metrics={loads:0,cacheHits:0,invalidations:0,lastLoadAt:null,lastError:null};
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const db=()=>window.LuviaSupabaseService?.getClient?.()||window.ParisSupabaseClient||window.ParisCloud?.client||null;
const activeTrip=()=>window.LuviaTripContext?.getActiveTrip?.()||window.LuviaAppState?.getSnapshot?.()?.trip?.trip||null;
const tripId=t=>String(t?.tripId||t?.id||'');
const keyOf=(id,scope='full')=>`${id}:${scope}`;
function emit(reason,detail={}){const payload={reason,version:VERSION,...detail};listeners.forEach(fn=>{try{fn(payload)}catch{}});window.dispatchEvent(new CustomEvent('luvia:journey-context-changed',{detail:payload}))}
function normalizePlace(p={}){return{id:p.id||null,providerPlaceId:p.provider_place_id||p.providerPlaceId||null,name:p.name||p.display_name||'',address:p.address||p.formatted_address||'',latitude:p.latitude??p.location?.latitude??null,longitude:p.longitude??p.location?.longitude??null,primaryType:p.primary_type||p.primaryType||null,types:p.categories||p.types||[],rating:p.rating??null,ratingCount:p.rating_count??p.userRatingCount??0,openingHours:p.opening_hours||p.openingHours||{},website:p.website||null,phone:p.phone||null,mapsUrl:p.maps_url||p.mapsUri||null,attributes:p.attributes||{},businessStatus:p.business_status||p.businessStatus||null}}
function normalizeReservation(r={}){return{id:r.id||null,status:r.reservation_status||r.reservationStatus||'idea',date:r.reservation_date||r.reservationDate||null,time:r.reservation_time||r.reservationTime||null,name:r.reservation_name||r.reservationName||null,url:r.reservation_url||r.reservationUrl||null,notes:r.reservation_notes||r.reservationNotes||null,menuUrl:r.menu_url||r.menuUrl||null,visited:Boolean(r.visited),personalRating:r.personal_rating??r.personalRating??null,metadata:r.metadata||{}}}
function normalizeEvent(row={},place=null,tripPlace=null,restaurant=null){const date=row.event_date||String(row.occurred_at||'').slice(0,10)||null;const time=row.start_time||String(row.occurred_at||'').slice(11,16)||null;return{id:row.id,source:row.__source||'schedule',sourceKey:row.source_key||row.id,tripId:row.trip_id,entityType:row.entity_type||row.metadata?.placeType||tripPlace?.module_key||place?.primaryType||'place',title:row.title||place?.name||'Reiseeintrag',description:row.description||'',date,time,startAt:row.occurred_at||(date?`${date}T${time||'00:00'}:00`:null),endTime:row.end_time||null,durationMinutes:Number(row.duration_minutes||0)||null,placeId:row.place_id||tripPlace?.place_id||null,tripPlaceId:row.trip_place_id||tripPlace?.id||null,providerPlaceId:row.provider_place_id||place?.providerPlaceId||null,metadata:row.metadata||{},place:place||null,tripPlace:tripPlace||null,reservation:restaurant||null,evidenceRefs:[`timeline:${row.__source||'schedule'}:${row.id}`,...(place?[`place:${place.id}`]:[]),...(restaurant?[`reservation:${restaurant.id}`]:[])]}}
async function query(table,select,trip){const c=db();if(!c?.from)return{data:[],error:new Error('SUPABASE_UNAVAILABLE')};return c.from(table).select(select).eq('trip_id',trip)}
async function load(options={}){
 const trip=options.trip||activeTrip();const id=tripId(trip);if(!id)return{schemaVersion:2,trip:null,events:[],places:[],reservations:[],evidence:[],generatedAt:new Date().toISOString(),unavailable:true};
 const key=keyOf(id,options.scope||'full'),cached=cache.get(key);if(cached&&!options.force&&cached.expiresAt>Date.now()){metrics.cacheHits++;return clone(cached.value)}
 const c=db();if(!c?.from)throw new Error('Journey Knowledge Graph benötigt Supabase.');
 metrics.loads++;metrics.lastLoadAt=new Date().toISOString();
 try{
  const [schedule,timeline,tripPlaces,dataRows,members]=await Promise.all([
   query('trip_schedule_events','*',id),query('timeline_events','*',id),query('trip_places','*',id),query('trip_place_data','*',id),query('trip_members','*',id)
  ]);for(const r of [schedule,timeline,tripPlaces,dataRows,members])if(r.error)throw r.error;
  const tps=tripPlaces.data||[];const placeIds=[...new Set(tps.map(x=>x.place_id).concat((schedule.data||[]).map(x=>x.place_id),(timeline.data||[]).map(x=>x.place_id)).filter(Boolean))];
  let places=[];if(placeIds.length){const pr=await c.from('places').select('*').in('id',placeIds);if(pr.error)throw pr.error;places=(pr.data||[]).map(normalizePlace)}
  const placeMap=new Map(places.map(p=>[String(p.id),p])),tpMap=new Map(tps.map(tp=>[String(tp.id),tp]));
  const restaurantTpIds=tps.filter(tp=>tp.module_key==='restaurants').map(tp=>tp.id);let restaurants=[];if(restaurantTpIds.length){const rr=await c.from('restaurants').select('*').in('trip_place_id',restaurantTpIds);if(rr.error)throw rr.error;restaurants=rr.data||[]}
  const restaurantMap=new Map(restaurants.map(r=>[String(r.trip_place_id),normalizeReservation(r)]));
  const rows=[...(schedule.data||[]).map(x=>({...x,__source:'schedule'})),...(timeline.data||[]).map(x=>({...x,__source:'timeline'}))];
  const explicitKeys=new Set(rows.map(r=>`${r.trip_place_id||''}:${r.event_date||String(r.occurred_at||'').slice(0,10)}:${r.start_time||String(r.occurred_at||'').slice(11,16)}`));
  for(const d of dataRows.data||[]){const fields=d.fields||{};for(const field of ['planned_at','reservation_at','check_in_at','check_out_at']){if(!fields[field])continue;const dt=new Date(fields[field]);const k=`${d.trip_place_id}:${dt.toISOString().slice(0,10)}:${dt.toISOString().slice(11,16)}`;if(explicitKeys.has(k))continue;rows.push({id:`${d.id}:${field}`,__source:'trip_place_data',trip_id:id,trip_place_id:d.trip_place_id,place_id:d.place_id,entity_type:d.place_type,title:`${field==='reservation_at'?'Reservierung':field==='check_in_at'?'Check-in':field==='check_out_at'?'Check-out':'Geplant'} · ${placeMap.get(String(d.place_id))?.name||'Place'}`,occurred_at:dt.toISOString(),metadata:{field,fields}})} }
  const events=rows.map(row=>{const tp=tpMap.get(String(row.trip_place_id))||tps.find(x=>String(x.place_id)===String(row.place_id))||null;const place=placeMap.get(String(row.place_id||tp?.place_id))||null;return normalizeEvent(row,place,tp,restaurantMap.get(String(tp?.id))||null)}).sort((a,b)=>new Date(a.startAt||0)-new Date(b.startAt||0));
  const reservations=restaurants.map(r=>({tripPlaceId:r.trip_place_id,...normalizeReservation(r),place:placeMap.get(String(tpMap.get(String(r.trip_place_id))?.place_id))||null}));
  const evidence=[];for(const e of events)evidence.push({id:`event:${e.id}`,kind:'timeline_event',source:e.source,confidence:1,observedAt:e.startAt,payload:{title:e.title,date:e.date,time:e.time,entityType:e.entityType,placeId:e.placeId,tripPlaceId:e.tripPlaceId}});for(const p of places)evidence.push({id:`place:${p.id}`,kind:'provider_place',source:'supabase_places',confidence:1,payload:p});for(const r of reservations)evidence.push({id:`reservation:${r.id}`,kind:'reservation',source:'supabase_restaurants',confidence:1,payload:r});
  const value={schemaVersion:2,trip:{id,title:trip.title||trip.tripName||'',destination:trip.destination||{},startDate:trip.startDate||trip.start_date||null,endDate:trip.endDate||trip.end_date||null},participants:(members.data||[]).map(m=>({id:m.user_id||m.id,name:m.display_name||m.member_name||m.name||'Mitreisender',role:m.role||null})),events,places,reservations,tripPlaces:tps,placeData:dataRows.data||[],evidence,summary:{eventCount:events.length,placeCount:places.length,reservationCount:reservations.length,nextEvent:events.find(e=>new Date(e.startAt)>new Date())||null},generatedAt:new Date().toISOString(),cloudAuthoritative:true};
  cache.set(key,{value,expiresAt:Date.now()+60000});emit('loaded',{tripId:id,summary:value.summary});return clone(value)
 }catch(error){metrics.lastError=error.message||String(error);emit('load-failed',{tripId:id,error:metrics.lastError});throw error}
}
function invalidate(reason='manual',detail={}){cache.clear();metrics.invalidations++;emit('invalidated',{cause:reason,...detail})}
function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
function diagnostics(){return{version:VERSION,cloudAuthoritative:true,cacheEntries:cache.size,metrics:clone(metrics),contracts:['timeline-place-link','restaurant-resolution','reservation-resolution','evidence-refs']}}
['luvia:timeline-changed','luvia:timeline-cloud-changed','luvia:trip-place-data-changed','luvia:place-plan-changed','luvia:place-collection-changed','luvia:trip-changed','luvia:user-preferences-changed'].forEach(name=>window.addEventListener(name,e=>invalidate(name,e.detail||{})));
window.LuviaJourneyKnowledgeGraph=Object.freeze({version:VERSION,load,invalidate,subscribe,diagnostics});
})();
