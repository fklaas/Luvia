(() => {
  'use strict';
  const VERSION='4.1.3.5';
  const listeners=new Set();
  const STORAGE='luvia.schedule.v4';
  const state={loading:false,tripId:null,events:[],today:[],next:null,freeWindow:null,warnings:[],lastUpdatedAt:null,lastError:null};
  let refreshPromise=null,refreshQueued=false,refreshEpoch=0;
  const pendingWrites=new Set();
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const pad=n=>String(n).padStart(2,'0');
  const dayKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const todayKey=()=>dayKey(new Date());
  const parseDateTime=(date,time)=>{if(!date||!time)return null;const d=new Date(`${date}T${time}:00`);return Number.isNaN(d.getTime())?null:d};
  const formatTime=d=>d?`${pad(d.getHours())}:${pad(d.getMinutes())}`:null;
  const tripId=()=>String(window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||'');
  const readLocal=id=>{try{return JSON.parse(localStorage.getItem(`${STORAGE}.${id}`)||'[]')}catch{return[]}};
  const writeLocal=(id,events)=>{try{localStorage.setItem(`${STORAGE}.${id}`,JSON.stringify(events))}catch{}};
  const sourceKey=e=>String(e?.source?.tripPlaceId||e?.tripPlaceId||e?.placeId||e?.source?.placeId||e?.providerPlaceId||e?.source?.providerPlaceId||e?.id||'');
  const trackWrite=promise=>{pendingWrites.add(promise);promise.finally(()=>pendingWrites.delete(promise));return promise};
  const waitForPersistence=async()=>{if(pendingWrites.size)await Promise.allSettled([...pendingWrites])};
  const persistEvent=(id,event)=>{if(!id||!event||!window.LuviaBackend?.request)return Promise.resolve(null);const end=new Date(event.endAt);const promise=window.LuviaBackend.request('schedule.upsert',{tripId:id,event:{sourceKey:sourceKey(event),entityType:event.entityType||'place',placeId:event.placeId||event.source?.placeId||null,tripPlaceId:event.tripPlaceId||event.source?.tripPlaceId||null,providerPlaceId:event.providerPlaceId||event.source?.providerPlaceId||null,title:event.title,date:event.date,time:event.time,endTime:Number.isNaN(end.getTime())?null:formatTime(end),durationMinutes:event.durationMinutes||60,lifecycleStatus:event.lifecycleStatus||'planned',metadata:{source:'schedule-intelligence',displayName:event.title}}}).catch(error=>{console.warn('[Luvia Schedule] Persistenz fehlgeschlagen',error);throw error});return trackWrite(promise)};
  const loadPersisted=async id=>{if(!id||!window.LuviaBackend?.request)return[];let lastError=null;for(const delay of [0,250,700]){if(delay)await new Promise(resolve=>setTimeout(resolve,delay));try{const r=await window.LuviaBackend.request('schedule.list',{tripId:id});return(r?.data?.events||[]).map(row=>{const start=parseDateTime(row.event_date,row.start_time?.slice?.(0,5)||row.start_time);if(!start)return null;const duration=Number(row.duration_minutes||60);return{id:String(row.source_key||row.id),entityType:row.entity_type||'place',title:row.title||row.metadata?.displayName||'Ort',date:row.event_date,time:String(row.start_time||'').slice(0,5),startAt:start.toISOString(),endAt:new Date(start.getTime()+duration*60000).toISOString(),durationMinutes:duration,lifecycleStatus:row.lifecycle_status||'planned',placeId:row.place_id||null,tripPlaceId:row.trip_place_id||null,providerPlaceId:row.provider_place_id||null,source:{persisted:true,tripPlaceId:row.trip_place_id,placeId:row.place_id,providerPlaceId:row.provider_place_id,metadata:row.metadata||{}}}}).filter(Boolean)}catch(error){lastError=error}}console.warn('[Luvia Schedule] Persistierte Planung konnte nicht geladen werden.',lastError);return[]};
  const travelMinutes=(distance,mode)=>window.LuviaRestaurantIntelligence?.minutesFor?.(distance,mode)||((Number(distance)>2000)?Math.max(5,Math.ceil(Number(distance)/420)+3):Math.max(1,Math.ceil(Number(distance)/75)));
  function normalizeRestaurant(entry){
    const date=entry.date||entry.plannedDate||entry.rawEntity?.tripPlace?.planned_date||entry.reservationDate||null,time=entry.time||entry.plannedTime||entry.rawEntity?.tripPlace?.planned_time||entry.reservationTime||entry.recommendedVisitTime||null;
    const start=parseDateTime(date,time);if(!start)return null;
    const duration=Number(entry.metadata?.expectedDurationMinutes||90);
    return {id:String(entry.tripPlaceId||entry.id||entry.providerPlaceId||''),entityType:'restaurant',title:entry.name||entry.metadata?.displayName||entry.rawEntity?.restaurant?.metadata?.displayName||'Restaurant',date,time,startAt:start.toISOString(),endAt:new Date(start.getTime()+duration*60000).toISOString(),durationMinutes:duration,distanceMeters:Number.isFinite(Number(entry.distanceMeters))?Number(entry.distanceMeters):null,reservationStatus:entry.reservationStatus||'idea',lifecycleStatus:entry.lifecycleStatus||'saved',source:entry};
  }
  function sortEvents(events){return [...events].sort((a,b)=>new Date(a.startAt)-new Date(b.startAt))}

  const cleanKey=value=>String(value||'').trim();
  function eventIdentityKeys(event={}){
    const source=event.source||{},raw=source.rawEntity||{},tripPlace=raw.tripPlace||source.tripPlace||{};
    const keys=[event.id,event.placeId,event.providerPlaceId,event.tripPlaceId,source.id,source.placeId,source.providerPlaceId,source.tripPlaceId,tripPlace.id,raw.place?.id,raw.place?.providerPlaceId]
      .map(cleanKey).filter(Boolean).map(value=>`id:${value}`);
    const title=cleanKey(event.title||event.name||source.name).toLowerCase();
    if(title)keys.push(`title:${String(event.entityType||'place')}:${title}`);
    return new Set(keys);
  }
  function sameEventIdentity(a,b){
    const left=eventIdentityKeys(a),right=eventIdentityKeys(b);
    for(const key of left)if(right.has(key))return true;
    return false;
  }
  function dedupeEvents(events){
    const result=[];
    for(const event of sortEvents(events)){
      const index=result.findIndex(existing=>sameEventIdentity(existing,event));
      if(index<0){result.push(event);continue;}
      const current=result[index];
      const rank=item=>item?.source?.persisted?30:(item?.source?.rawEntity||item?.source?.tripPlaceId?20:10);
      const winner=rank(event)>=rank(current)?event:current,loser=winner===event?current:event;
      result[index]={...loser,...winner,source:{...(loser.source||{}),...(winner.source||{})}};
    }
    return sortEvents(result);
  }
  function windowBetween(a,b){if(!a||!b)return null;const start=new Date(a.endAt),end=new Date(b.startAt),minutes=Math.floor((end-start)/60000);return minutes>0?{startAt:start.toISOString(),endAt:end.toISOString(),minutes,label:`${formatTime(start)}–${formatTime(end)} Uhr`}:null}
  function analyze(place,events=state.events,options={}){
    const date=place?.date||place?.reservationDate||options.date||todayKey();
    const time=place?.time||place?.reservationTime||place?.recommendedVisitTime||place?.intelligence?.bestTime||options.time||'18:45';
    const visit=parseDateTime(date,time);
    const distance=Number.isFinite(Number(place?.distanceMeters))?Number(place.distanceMeters):null;
    const mode=distance!=null&&distance>2000?'drive':'walk';
    const travel=distance==null?null:travelMinutes(distance,mode);
    const buffer=Number(options.bufferMinutes||10);
    const leave=visit&&travel!=null?new Date(visit.getTime()-(travel+buffer)*60000):null;
    const dayEvents=sortEvents(events.filter(e=>e.date===date&&String(e.id)!==String(place?.tripPlaceId||place?.id||'')));
    const previous=visit?[...dayEvents].reverse().find(e=>new Date(e.endAt)<=visit)||null:null;
    const next=visit?dayEvents.find(e=>new Date(e.startAt)>=visit)||null:null;
    const conflicts=[];
    if(previous&&leave&&new Date(previous.endAt)>leave)conflicts.push(`Nach „${previous.title}“ bleibt nicht genug Zeit für Weg und Puffer.`);
    const end=visit?new Date(visit.getTime()+Number(place?.metadata?.expectedDurationMinutes||90)*60000):null;
    if(next&&end&&end>new Date(next.startAt))conflicts.push(`Der Besuch überschneidet sich mit „${next.title}“.`);
    const now=new Date(),minutesUntilLeave=leave?Math.round((leave-now)/60000):null;
    const freeBefore=previous&&visit?windowBetween(previous,{startAt:visit.toISOString()}):null;
    const freeAfter=next&&end?windowBetween({endAt:end.toISOString()},next):null;
    let status='planned';
    if(conflicts.length)status='conflict';else if(minutesUntilLeave!=null&&minutesUntilLeave<=0&&minutesUntilLeave>-30)status='leave-now';else if(minutesUntilLeave!=null&&minutesUntilLeave>0&&minutesUntilLeave<=60)status='leave-soon';
    const guidance=[];
    if(status==='leave-now')guidance.push('Jetzt losgehen, damit ihr mit Puffer ankommt.');
    else if(status==='leave-soon')guidance.push(`In ${minutesUntilLeave} Minuten losgehen.`);
    else if(leave)guidance.push(`Abfahrt gegen ${formatTime(leave)} Uhr einplanen.`);
    if(previous)guidance.push(`Passt nach „${previous.title}“ in euren Tagesablauf.`);
    if(next&&!conflicts.length)guidance.push(`Danach bleibt ausreichend Zeit bis „${next.title}“.`);
    if(conflicts.length)guidance.push('Zeit oder Reihenfolge im Tagesplan anpassen.');
    return {version:VERSION,date,time,visitAt:visit?.toISOString()||null,endAt:end?.toISOString()||null,leaveAt:leave?.toISOString()||null,leaveTime:formatTime(leave),minutesUntilLeave,travelMinutes:travel,travelMode:mode,travelLabel:travel==null?'Wegzeit nach Standortfreigabe':`${travel} Min. ${mode==='walk'?'zu Fuß':'mit dem Auto'}`,bufferMinutes:buffer,previous,next,freeBefore,freeAfter,conflicts,status,guidance};
  }
  function buildSummary(events){
    const key=todayKey(),today=sortEvents(events.filter(e=>e.date===key));
    const future=sortEvents(events.filter(e=>new Date(e.startAt)>new Date()));
    const next=future[0]||today[0]||null;
    let freeWindow=null;
    if(today.length>=2){for(let i=0;i<today.length-1;i++){const w=windowBetween(today[i],today[i+1]);if(w&&w.minutes>=45){freeWindow=w;break}}}
    const warnings=[];
    for(let i=0;i<today.length-1;i++){if(new Date(today[i].endAt)>new Date(today[i+1].startAt))warnings.push(`„${today[i].title}“ und „${today[i+1].title}“ überschneiden sich.`)}
    return {today,next,freeWindow,warnings};
  }
  function emit(){const snap=snapshot();listeners.forEach(fn=>{try{fn(snap)}catch{}});window.dispatchEvent(new CustomEvent('luvia:schedule-intelligence-changed',{detail:snap}))}
  async function refresh(options={}){
    const id=String(options.tripId||tripId());if(!id)return snapshot();
    const local=readLocal(id);
    if(state.tripId!==id){state.tripId=id;if(local.length){const initial=dedupeEvents(local),summary=buildSummary(initial);Object.assign(state,{events:initial,...summary,lastUpdatedAt:state.lastUpdatedAt||new Date().toISOString(),lastError:null});emit()}}
    if(state.loading){if(options.force)refreshQueued=true;await refreshPromise;return options.force?refresh({tripId:id,force:false,skipThrottle:true}):snapshot()}
    if(!options.force&&!options.skipThrottle&&state.tripId===id&&state.lastUpdatedAt&&Date.now()-new Date(state.lastUpdatedAt).getTime()<15000)return snapshot();
    const epoch=++refreshEpoch;state.loading=true;
    refreshPromise=(async()=>{
      try{
        await waitForPersistence();
        const persistedPromise=loadPersisted(id);
        const restaurantPromise=window.LuviaRestaurants?.list?window.LuviaRestaurants.list({tripId:id}).then(response=>(response?.data?.entities||[]).map(window.LuviaRestaurants.entityToEntry).map(normalizeRestaurant).filter(Boolean)).catch(error=>{console.warn('[Luvia Schedule] Restaurantplanung konnte nicht geladen werden.',error);return[]}):Promise.resolve([]);
        const [persisted,remote]=await Promise.all([persistedPromise,restaurantPromise]);
        if(epoch!==refreshEpoch)return;
        const latestLocal=readLocal(id),events=dedupeEvents([...latestLocal,...remote,...persisted]);
        if(events.length||!state.events.length){writeLocal(id,events);const summary=buildSummary(events);Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),lastError:null})}
      }catch(error){state.lastError=error?.message||String(error)}finally{if(epoch===refreshEpoch){state.loading=false;emit()}}
    })();
    await refreshPromise;refreshPromise=null;
    if(refreshQueued){refreshQueued=false;return refresh({tripId:id,force:false,skipThrottle:true})}
    return snapshot();
  }


  function upsertRestaurant(entry){
    const normalized=normalizeRestaurant(entry);
    if(!normalized)return snapshot();
    const events=dedupeEvents([...state.events.filter(e=>!sameEventIdentity(e,normalized)),normalized]);
    const summary=buildSummary(events);
    Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),lastError:null,loading:false});
    const id=String(entry.tripId||state.tripId||tripId());if(id){state.tripId=id;writeLocal(id,events)}
    emit();
    persistEvent(id,normalized).catch(()=>{});
    return snapshot();
  }
  async function upsertRestaurantAsync(entry){upsertRestaurant(entry);await waitForPersistence();return snapshot()}
  function upsertEvent(event){if(!event?.date||!event?.time||!event?.title)return snapshot();const start=parseDateTime(event.date,event.time);if(!start)return snapshot();const normalized={id:String(event.id||event.placeId||crypto.randomUUID()),entityType:event.entityType||'place',title:event.title,date:event.date,time:event.time,startAt:start.toISOString(),endAt:event.endAt||new Date(start.getTime()+Number(event.durationMinutes||90)*60000).toISOString(),durationMinutes:Number(event.durationMinutes||90),source:event.source||event};const events=dedupeEvents([...state.events.filter(e=>!sameEventIdentity(e,normalized)),normalized]);const summary=buildSummary(events);Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),loading:false});const id=String(event.tripId||state.tripId||tripId());if(id){state.tripId=id;writeLocal(id,events);persistEvent(id,normalized)}emit();return snapshot()}
  function removeEvent(id,options={}){const key=String(id||'');if(!key)return snapshot();const before=state.events.length;const events=state.events.filter(e=>String(e.id)!==key);if(events.length===before)return snapshot();const summary=buildSummary(events);Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),loading:false});const active=String(options.tripId||state.tripId||tripId());if(active){state.tripId=active;writeLocal(active,events);window.LuviaBackend?.request?.('schedule.delete',{tripId:active,sourceKey:key}).catch(error=>console.warn('[Luvia Schedule] Remote-Löschung fehlgeschlagen',error))}emit();return snapshot()}
  function snapshot(){return clone(state)}
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  const api=Object.freeze({version:VERSION,refresh,upsertRestaurant,upsertRestaurantAsync,upsertEvent,removeEvent,waitForPersistence,snapshot,subscribe,analyze,travelMinutes,diagnostics:()=>({version:VERSION,persistenceKey:STORAGE,...snapshot(),trace:(state.events||[]).map(e=>({id:e.id,entityType:e.entityType,date:e.date,time:e.time,startAt:e.startAt,source:Boolean(e.source)}))})});
  window.LuviaScheduleIntelligence=api;
  ['luvia:trip-changed','luvia:restaurant-lifecycle-changed','luvia:restaurant-imported','luvia:restaurants-v2-updated','luvia:travel-context-changed','luvia:auth-changed'].forEach(name=>window.addEventListener(name,()=>refresh().catch(()=>{})));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh().catch(()=>{}),{once:true});else queueMicrotask(()=>refresh().catch(()=>{}));
})();
