(() => {
  'use strict';
  const VERSION='4.1.3';
  const listeners=new Set();
  const STORAGE='luvia.schedule.v4';
  const state={loading:false,tripId:null,events:[],today:[],next:null,freeWindow:null,warnings:[],lastUpdatedAt:null,lastError:null};
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const pad=n=>String(n).padStart(2,'0');
  const dayKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const todayKey=()=>dayKey(new Date());
  const parseDateTime=(date,time)=>{if(!date||!time)return null;const d=new Date(`${date}T${time}:00`);return Number.isNaN(d.getTime())?null:d};
  const formatTime=d=>d?`${pad(d.getHours())}:${pad(d.getMinutes())}`:null;
  const tripId=()=>String(window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||'');
  const readLocal=id=>{try{return JSON.parse(localStorage.getItem(`${STORAGE}.${id}`)||'[]')}catch{return[]}};
  const writeLocal=(id,events)=>{try{localStorage.setItem(`${STORAGE}.${id}`,JSON.stringify(events))}catch{}};
  const travelMinutes=(distance,mode)=>window.LuviaRestaurantIntelligence?.minutesFor?.(distance,mode)||((Number(distance)>2000)?Math.max(5,Math.ceil(Number(distance)/420)+3):Math.max(1,Math.ceil(Number(distance)/75)));
  function normalizeRestaurant(entry){
    const date=entry.date||entry.plannedDate||entry.rawEntity?.tripPlace?.planned_date||entry.reservationDate||null,time=entry.time||entry.plannedTime||entry.rawEntity?.tripPlace?.planned_time||entry.reservationTime||entry.recommendedVisitTime||null;
    const start=parseDateTime(date,time);if(!start)return null;
    const duration=Number(entry.metadata?.expectedDurationMinutes||90);
    return {id:String(entry.tripPlaceId||entry.id||entry.providerPlaceId||''),entityType:'restaurant',title:entry.name||'Restaurant',date,time,startAt:start.toISOString(),endAt:new Date(start.getTime()+duration*60000).toISOString(),durationMinutes:duration,distanceMeters:Number.isFinite(Number(entry.distanceMeters))?Number(entry.distanceMeters):null,reservationStatus:entry.reservationStatus||'idea',lifecycleStatus:entry.lifecycleStatus||'saved',source:entry};
  }
  function sortEvents(events){return [...events].sort((a,b)=>new Date(a.startAt)-new Date(b.startAt))}
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
    const id=String(options.tripId||tripId());if(!id||!window.LuviaRestaurants?.list)return snapshot();if(state.loading)return snapshot();
    if(!options.force&&state.tripId===id&&state.lastUpdatedAt&&Date.now()-new Date(state.lastUpdatedAt).getTime()<30000)return snapshot();
    state.loading=true;state.tripId=id;emit();
    try{const response=await window.LuviaRestaurants.list({tripId:id});const entries=(response?.data?.entities||[]).map(window.LuviaRestaurants.entityToEntry);const remote=entries.map(normalizeRestaurant).filter(Boolean),local=readLocal(id);const byId=new Map(remote.map(e=>[String(e.id),e]));local.forEach(e=>{if(!byId.has(String(e.id)))byId.set(String(e.id),e)});const events=sortEvents([...byId.values()]);writeLocal(id,events);const summary=buildSummary(events);Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),lastError:null});}
    catch(error){state.lastError=error?.message||String(error)}finally{state.loading=false;emit()}
    return snapshot();
  }

  function upsertRestaurant(entry){
    const normalized=normalizeRestaurant(entry);
    if(!normalized)return snapshot();
    const events=sortEvents([...state.events.filter(e=>String(e.id)!==String(normalized.id)),normalized]);
    const summary=buildSummary(events);
    Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),lastError:null,loading:false});
    const id=String(entry.tripId||state.tripId||tripId());if(id){state.tripId=id;writeLocal(id,events)}
    emit();
    return snapshot();
  }
  function upsertEvent(event){if(!event?.date||!event?.time||!event?.title)return snapshot();const start=parseDateTime(event.date,event.time);if(!start)return snapshot();const normalized={id:String(event.id||event.placeId||crypto.randomUUID()),entityType:event.entityType||'place',title:event.title,date:event.date,time:event.time,startAt:start.toISOString(),endAt:event.endAt||new Date(start.getTime()+Number(event.durationMinutes||90)*60000).toISOString(),durationMinutes:Number(event.durationMinutes||90),source:event.source||event};const events=sortEvents([...state.events.filter(e=>String(e.id)!==String(normalized.id)),normalized]);const summary=buildSummary(events);Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),loading:false});const id=String(event.tripId||state.tripId||tripId());if(id){state.tripId=id;writeLocal(id,events)}emit();return snapshot()}
  function removeEvent(id,options={}){const key=String(id||'');if(!key)return snapshot();const before=state.events.length;const events=state.events.filter(e=>String(e.id)!==key);if(events.length===before)return snapshot();const summary=buildSummary(events);Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),loading:false});const active=String(options.tripId||state.tripId||tripId());if(active){state.tripId=active;writeLocal(active,events)}emit();return snapshot()}
  function snapshot(){return clone(state)}
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  const api=Object.freeze({version:VERSION,refresh,upsertRestaurant,upsertEvent,removeEvent,snapshot,subscribe,analyze,travelMinutes,diagnostics:()=>({version:VERSION,persistenceKey:STORAGE,...snapshot(),trace:(state.events||[]).map(e=>({id:e.id,entityType:e.entityType,date:e.date,time:e.time,startAt:e.startAt,source:Boolean(e.source)}))})});
  window.LuviaScheduleIntelligence=api;
  ['luvia:trip-changed','luvia:restaurant-lifecycle-changed','luvia:restaurants-v2-updated','luvia:travel-context-changed'].forEach(name=>window.addEventListener(name,()=>refresh().catch(()=>{})));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh().catch(()=>{}),{once:true});else queueMicrotask(()=>refresh().catch(()=>{}));
})();
