(() => {
'use strict';
const VERSION='4.27.3';
const clean=v=>String(v??'').trim();
const provider=e=>clean(e?.place?.provider_place_id||e?.place?.source_id||e?.providerPlaceId).replace(/^places\//,'');
const client=()=>window.LuviaSupabaseService?.getClient?.();
const memoryPattern=/(photo|memory|album|reisebuch|travel_book|live_moment)/i;
const plannedPattern=/(planned|schedule|timeline|place_planned)/i;

async function loadEvidence(tripId){
 const db=client();
 const empty={visits:new Map(),planned:new Map(),memories:new Map()};
 if(!db||!tripId||!navigator.onLine)return empty;
 const [visitsResult,dataResult,eventsResult]=await Promise.all([
  db.from('place_visits').select('place_id,trip_place_id,arrived_at,state,is_confirmed').eq('trip_id',tripId).order('arrived_at',{ascending:false}),
  db.from('trip_place_data').select('trip_place_id,place_id,place_type,fields').eq('trip_id',tripId),
  db.from('timeline_events').select('place_id,event_type,title,occurred_at,metadata').eq('trip_id',tripId).order('occurred_at',{ascending:false})
 ]);
 for(const result of [visitsResult,dataResult,eventsResult])if(result.error)throw result.error;
 const visits=new Map(),planned=new Map(),memories=new Map();
 for(const row of visitsResult.data||[]){
  const keys=[clean(row.trip_place_id),clean(row.place_id)].filter(Boolean);
  for(const key of keys)if(!visits.has(key))visits.set(key,row);
 }
 for(const row of dataResult.data||[]){
  const fields=row.fields&&typeof row.fields==='object'?row.fields:{};
  const value=fields.planned_at||fields.start_at||fields.check_in_at||fields.reservation_at||null;
  if(value){for(const key of [clean(row.trip_place_id),clean(row.place_id)].filter(Boolean))planned.set(key,{...row,plannedAt:value});}
 }
 for(const row of eventsResult.data||[]){
  const type=`${row.event_type||''} ${row.metadata?.eventType||''}`;
  if(!memoryPattern.test(type))continue;
  for(const key of [clean(row.metadata?.tripPlaceId),clean(row.place_id)].filter(Boolean)){
   if(!memories.has(key))memories.set(key,[]);
   memories.get(key).push({kind:row.event_type,title:row.title,occurredAt:row.occurred_at,metadata:row.metadata||{}});
  }
 }
 return{visits,planned,memories};
}

function project(entity,evidence={visits:new Map(),planned:new Map(),memories:new Map()}){
 const p=entity?.place||{},tp=entity?.tripPlace||entity?.trip_place||{};
 const keys=[clean(tp.id),clean(p.id)].filter(Boolean);
 const visit=keys.map(k=>evidence.visits.get(k)).find(Boolean)||null;
 const plan=keys.map(k=>evidence.planned.get(k)).find(Boolean)||null;
 const memoryEvidence=keys.flatMap(k=>evidence.memories.get(k)||[]);
 const fallbackStatus=clean(tp.lifecycle_status||tp.status).toLowerCase();
 const plannedAt=plan?.plannedAt||tp.planned_at||tp.planned_date||null;
 const visitedAt=visit?.arrived_at||tp.visited_at||null;
 const lifecycle=memoryEvidence.length?'remembered':visitedAt||['visited','checked_in','checked_out','rated'].includes(fallbackStatus)?'visited':plannedAt||['planned','reserved','selected','booked'].includes(fallbackStatus)?'planned':'discovered';
 return{entity,place:p,tripPlace:tp,id:clean(p.id),tripPlaceId:clean(tp.id),providerPlaceId:provider(entity),name:clean(tp.custom_name||p.name||'Unbenannter Ort'),address:clean(p.address||p.formatted_address),primaryType:clean(p.primary_type||'custom'),lifecycle,plannedAt,visitedAt,memoryEvidence,isFavorite:Boolean(tp.is_favorite)};
}

async function resolve({tripId,entities=[]}={}){const evidence=await loadEvidence(tripId);return entities.map(e=>project(e,evidence));}
function diagnostics(){return{version:VERSION,status:'ready',cloudAuthoritative:true,sources:['trip_places','trip_place_data','place_visits','timeline_events'],optimisticLifecycle:false,hydratesTimeline:false,queryCount:3};}
window.LuviaPlaceLifecycleResolver=Object.freeze({version:VERSION,resolve,project,diagnostics});
})();
