(() => {
  'use strict';
  const VERSION='4.48.0';
  const listeners=new Set();
  const STORAGE='cloud-only';
  const REMOTE_RETRY_MS=[0];
  const state={loading:false,hydrated:false,tripId:null,events:[],today:[],next:null,freeWindow:null,warnings:[],lastUpdatedAt:null,lastError:null,persistence:'cloud'};
  let refreshPromise=null,refreshQueued=false,refreshEpoch=0;
  const pendingWrites=new Set();
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const pad=n=>String(n).padStart(2,'0');
  const dayKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const todayKey=()=>dayKey(new Date());
  const parseDateTime=(date,time)=>{if(!date||!time)return null;const d=new Date(`${date}T${time}:00`);return Number.isNaN(d.getTime())?null:d};
  const formatTime=d=>d?`${pad(d.getHours())}:${pad(d.getMinutes())}`:null;
  const tripId=()=>String(window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||'');
  const readLocal=()=>[];
  const writeLocal=()=>{};
  const lastTripId=()=>'';
  const readTombstones=()=>[];
  const writeTombstones=()=>{};
  const sourceKey=e=>String(e?.source?.tripPlaceId||e?.tripPlaceId||e?.placeId||e?.source?.placeId||e?.providerPlaceId||e?.source?.providerPlaceId||e?.id||'');
  const trackWrite=promise=>{pendingWrites.add(promise);promise.finally(()=>pendingWrites.delete(promise));return promise};
  const waitForPersistence=async()=>{if(pendingWrites.size)await Promise.allSettled([...pendingWrites])};
  const dbClient=()=>window.ParisSupabaseClient||window.ParisCloud?.client||window.LuviaDatabaseFoundation?.client?.()||null;
  const networkReady=()=>navigator.onLine!==false&&(window.LuviaNetworkGuard?.canRequest?.()??true);
  async function authenticatedClient(){const client=dbClient();if(!client?.auth?.getSession)return null;try{const {data}=await client.auth.getSession();return data?.session?.access_token?client:null}catch{return null}}
  const rowToEvent=row=>{const start=parseDateTime(row.event_date,row.start_time?.slice?.(0,5)||row.start_time);if(!start)return null;const duration=Number(row.duration_minutes||60);return{id:String(row.source_key||row.id),entityType:row.entity_type||'place',title:row.title||row.metadata?.displayName||'Ort',date:row.event_date,time:String(row.start_time||'').slice(0,5),startAt:start.toISOString(),endAt:new Date(start.getTime()+duration*60000).toISOString(),durationMinutes:duration,lifecycleStatus:row.lifecycle_status||'planned',placeId:row.place_id||null,tripPlaceId:row.trip_place_id||null,providerPlaceId:row.provider_place_id||null,source:{persisted:true,tripPlaceId:row.trip_place_id,placeId:row.place_id,providerPlaceId:row.provider_place_id,metadata:row.metadata||{}}}};
  const uuidOrNull=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''))?String(value):null;
  const currentUserId=()=>window.ParisAuth?.getState?.()?.user?.id||window.LuviaUser?.snapshot?.()?.id||null;
  const eventRow=(id,event)=>{const end=new Date(event.endAt),source=event.source||{},raw=source.rawEntity||{},trustedPlaceId=source.persistedPlace===true||source.persistedRestaurant===true||raw.place?.id?uuidOrNull(raw.place?.id||event.placeId||source.placeId):null;return{trip_id:id,user_id:currentUserId(),source_key:sourceKey(event),entity_type:event.entityType||'place',place_id:trustedPlaceId,trip_place_id:uuidOrNull(event.tripPlaceId||source.tripPlaceId||raw.tripPlace?.id),provider_place_id:event.providerPlaceId||source.providerPlaceId||raw.place?.providerPlaceId||null,title:event.title||'Ort',event_date:event.date,start_time:event.time,end_time:Number.isNaN(end.getTime())?null:formatTime(end),duration_minutes:Number(event.durationMinutes||60),lifecycle_status:event.lifecycleStatus||'planned',metadata:{...(event.source?.metadata||{}),source:'schedule-intelligence',displayName:event.title||'Ort'}}};
  const isPermissionError=error=>String(error?.code||'')==='42501'||/permission denied|forbidden/i.test(String(error?.message||''));
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const persistEvent=(id,event)=>{if(!id||!event)return Promise.resolve(null);const row=eventRow(id,event);const promise=(async()=>{if(!networkReady()){state.persistence='offline';return null}const client=await authenticatedClient();if(!client){state.persistence='auth-wait';return null}const {data,error}=await client.from('trip_schedule_events').upsert(row,{onConflict:'trip_id,source_key'}).select().maybeSingle();if(!error){state.persistence='supabase-direct';window.LuviaNetworkGuard?.markSuccess?.();return data}if(isPermissionError(error)){state.persistence='permission-error';state.lastError='Schedule-Berechtigung nicht aktiv.';return null}state.persistence='supabase-error';window.LuviaNetworkGuard?.markFailure?.(error,{cooldownMs:8000});return null})().catch(error=>{state.lastError=error?.message||String(error);if(!window.LuviaNetworkGuard?.expected?.(error))console.warn('[Luvia Schedule] Persistenz fehlgeschlagen',error);return null});return trackWrite(promise)};
  const loadPersisted=async id=>{if(!id)return[];if(!networkReady()){state.persistence='offline';return[]}const client=await authenticatedClient();if(!client){state.persistence='auth-wait';return[]}const {data,error}=await client.from('trip_schedule_events').select('*').eq('trip_id',id).order('event_date',{ascending:true}).order('start_time',{ascending:true});if(!error){state.persistence='supabase-direct';state.lastError=null;window.LuviaNetworkGuard?.markSuccess?.();return(data||[]).map(rowToEvent).filter(Boolean)}if(isPermissionError(error)){state.persistence='permission-error';state.lastError='Schedule-Berechtigung nicht aktiv.';return[]}window.LuviaNetworkGuard?.markFailure?.(error,{cooldownMs:8000});state.persistence='supabase-error';state.lastError=error?.message||'Schedule nicht verfügbar.';return[]};
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
    if(!keys.length){
      const title=cleanKey(event.title||event.name||source.name).toLowerCase();
      const lat=Number(event.latitude??source.latitude??source.coordinates?.latitude);
      const lng=Number(event.longitude??source.longitude??source.coordinates?.longitude);
      if(title&&Number.isFinite(lat)&&Number.isFinite(lng))keys.push(`fallback:${String(event.entityType||'place')}:${title}:${lat.toFixed(5)}:${lng.toFixed(5)}`);
      else if(title)keys.push(`fallback:${String(event.entityType||'place')}:${title}:${cleanKey(event.date)}:${cleanKey(event.time)}`);
    }
    return new Set(keys);
  }
  function sameEventIdentity(a,b){
    const left=eventIdentityKeys(a),right=eventIdentityKeys(b);
    for(const key of left)if(right.has(key))return true;
    return false;
  }
  const tombstoneKeys=t=>new Set(Array.isArray(t?.keys)?t.keys:[]);
  function matchesTombstone(event,tombstones){const keys=eventIdentityKeys(event);for(const tomb of tombstones){const dead=tombstoneKeys(tomb);for(const key of keys)if(dead.has(key))return true}return false}
  function addTombstone(id,event){if(!id||!event)return;const keys=[...eventIdentityKeys(event)];if(!keys.length)return;const rows=readTombstones(id).filter(t=>!keys.some(k=>(t.keys||[]).includes(k)));rows.push({at:Date.now(),keys,title:event.title||null});writeTombstones(id,rows)}
  function clearMatchingTombstones(id,event){if(!id||!event)return;const keys=eventIdentityKeys(event);const rows=readTombstones(id).filter(t=>{for(const key of (t.keys||[]))if(keys.has(key))return false;return true});writeTombstones(id,rows)}
  function dedupeEvents(events){
    const result=[];
    for(const event of sortEvents(events)){
      const index=result.findIndex(existing=>sameEventIdentity(existing,event));
      if(index<0){result.push(event);continue;}
      const current=result[index];
      const rank=item=>item?.source?.optimistic?50:item?.source?.persisted?40:(item?.source?.rawEntity||item?.source?.tripPlaceId?30:item?.source?.cached?10:20);
      const winner=rank(event)>=rank(current)?event:current,loser=winner===event?current:event;
      result[index]={...loser,...winner,source:{...(loser.source||{}),...(winner.source||{})}};
    }
    return sortEvents(result);
  }
  function windowBetween(a,b){if(!a||!b)return null;const start=new Date(a.endAt),end=new Date(b.startAt),minutes=Math.floor((end-start)/60000);return minutes>0?{startAt:start.toISOString(),endAt:end.toISOString(),minutes,label:`${formatTime(start)}–${formatTime(end)} Uhr`}:null}
  function analyze(place,events=state.events,options={}){
    const date=place?.date||place?.reservationDate||options.date||todayKey();
    const time=place?.time||place?.reservationTime||place?.recommendedVisitTime||place?.intelligence?.bestTime||options.time||null;
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
    if(state.tripId!==id){state.tripId=id;const summary=buildSummary([]);Object.assign(state,{events:[],...summary,hydrated:false,lastUpdatedAt:null,lastError:null,persistence:'cloud'});emit()}
    if(state.loading){if(options.force)refreshQueued=true;await refreshPromise;return options.force?refresh({tripId:id,force:false,skipThrottle:true}):snapshot()}
    if(!options.force&&!options.skipThrottle&&state.tripId===id&&state.lastUpdatedAt&&Date.now()-new Date(state.lastUpdatedAt).getTime()<15000)return snapshot();
    const epoch=++refreshEpoch;state.loading=true;
    refreshPromise=(async()=>{
      try{
        await waitForPersistence();
        const persisted=await loadPersisted(id);
        if(epoch!==refreshEpoch)return;
        const events=dedupeEvents(persisted);
        const summary=buildSummary(events);
        Object.assign(state,{events,...summary,hydrated:true,lastUpdatedAt:new Date().toISOString(),lastError:null,persistence:state.persistence||'cloud'});
      }catch(error){state.lastError=error?.message||String(error)}finally{if(epoch===refreshEpoch){state.loading=false;emit()}}
    })();
    await refreshPromise;refreshPromise=null;
    if(refreshQueued){refreshQueued=false;return refresh({tripId:id,force:false,skipThrottle:true})}
    return snapshot();
  }


  function upsertRestaurant(entry){
    const normalized=normalizeRestaurant(entry);
    if(!normalized)return snapshot();
    normalized.source={...(normalized.source||{}),optimistic:true};
    const events=dedupeEvents([...state.events.filter(e=>!sameEventIdentity(e,normalized)),normalized]);
    const summary=buildSummary(events);
    Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),lastError:null,loading:false});
    const id=String(entry.tripId||state.tripId||tripId());if(id){state.tripId=id;clearMatchingTombstones(id,normalized)}
    emit();
    persistEvent(id,normalized).catch(()=>{});
    return snapshot();
  }
  async function upsertRestaurantAsync(entry){upsertRestaurant(entry);await waitForPersistence();return snapshot()}
  async function updateRestaurantTime(identity,changes={}){
    const existing=state.events.find(event=>sameEventIdentity(event,identity||{}));
    if(!existing)throw new Error('Der Tagesplaneintrag konnte nicht gefunden werden.');
    const date=changes.date||changes.plannedDate||existing.date;
    const time=changes.time||changes.plannedTime||existing.time;
    const start=parseDateTime(date,time);
    if(!start)throw new Error('Datum oder Uhrzeit ist ungültig.');
    const updated={...existing,...changes,date,time,startAt:start.toISOString(),endAt:new Date(start.getTime()+Number(changes.durationMinutes||existing.durationMinutes||90)*60000).toISOString(),source:{...(existing.source||{}),...(changes.source||{}),optimistic:true}};
    const events=dedupeEvents([...state.events.filter(event=>!sameEventIdentity(event,existing)),updated]);
    const summary=buildSummary(events);
    Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),lastError:null,loading:false});
    const id=String(changes.tripId||state.tripId||tripId());
    if(id){state.tripId=id;clearMatchingTombstones(id,updated);await persistEvent(id,updated)}
    emit();
    return clone(updated);
  }
  function upsertEvent(event){if(!event?.date||!event?.time||!event?.title)return snapshot();const start=parseDateTime(event.date,event.time);if(!start)return snapshot();const normalized={id:String(event.id||event.sourceKey||event.tripPlaceId||event.placeId||event.providerPlaceId||crypto.randomUUID()),entityType:event.entityType||'place',title:event.title,date:event.date,time:event.time,startAt:start.toISOString(),endAt:event.endAt||new Date(start.getTime()+Number(event.durationMinutes||90)*60000).toISOString(),durationMinutes:Number(event.durationMinutes||90),lifecycleStatus:event.lifecycleStatus||'planned',placeId:event.placeId||null,tripPlaceId:event.tripPlaceId||null,providerPlaceId:event.providerPlaceId||null,source:{...(event.source||event),optimistic:true}};const events=dedupeEvents([...state.events.filter(e=>!sameEventIdentity(e,normalized)),normalized]);const summary=buildSummary(events);Object.assign(state,{events,...summary,hydrated:true,lastUpdatedAt:new Date().toISOString(),loading:false});const id=String(event.tripId||state.tripId||tripId());if(id){state.tripId=id;clearMatchingTombstones(id,normalized);persistEvent(id,normalized).catch(()=>{})}emit();return snapshot()}
  function removeByIdentity(event,options={}){
    if(!event)return snapshot();
    const active=String(options.tripId||state.tripId||tripId());
    const keys=eventIdentityKeys(event);
    const removed=state.events.filter(existing=>sameEventIdentity(existing,event));
    const events=state.events.filter(existing=>!sameEventIdentity(existing,event));
    const summary=buildSummary(events);
    Object.assign(state,{events,...summary,lastUpdatedAt:new Date().toISOString(),loading:false});
    if(active){
      state.tripId=active;
      addTombstone(active,event);
      for(const item of removed)addTombstone(active,item);
      const sourceKeys=[...new Set([event,...removed].map(sourceKey).filter(Boolean))];
      const ids=[...new Set([event,...removed].flatMap(item=>[item?.tripPlaceId,item?.source?.tripPlaceId,item?.placeId,item?.source?.placeId,item?.providerPlaceId,item?.source?.providerPlaceId]).filter(Boolean).map(String))];
      trackWrite((async()=>{
        if(!networkReady()){state.persistence='offline';return false}
        const client=await authenticatedClient();
        if(!client){state.persistence='auth-wait';return false}
        for(const key of sourceKeys){const {error}=await client.from('trip_schedule_events').delete().eq('trip_id',active).eq('source_key',key);if(error){if(isPermissionError(error)){state.persistence='permission-error';return false}window.LuviaNetworkGuard?.markFailure?.(error,{cooldownMs:8000});return false}}
        for(const value of ids){
          if(uuidOrNull(value)){const {error}=await client.from('trip_schedule_events').delete().eq('trip_id',active).or(`trip_place_id.eq.${value},place_id.eq.${value}`);if(error){window.LuviaNetworkGuard?.markFailure?.(error,{cooldownMs:8000});return false}}
          const {error}=await client.from('trip_schedule_events').delete().eq('trip_id',active).eq('provider_place_id',value);if(error){window.LuviaNetworkGuard?.markFailure?.(error,{cooldownMs:8000});return false}
        }
        state.persistence='supabase-direct';window.LuviaNetworkGuard?.markSuccess?.();return true;
      })().catch(error=>{if(!window.LuviaNetworkGuard?.expected?.(error))state.lastError=error?.message||String(error);return false}));
    }
    emit();return snapshot();
  }
  async function clearByType(entityType,options={}){const type=String(entityType||'').trim();if(!type)return snapshot();const active=String(options.tripId||state.tripId||tripId());const matches=state.events.filter(event=>String(event.entityType||event.primaryType||event.source?.entityType||event.source?.primaryType||'')===type);for(const event of matches)removeByIdentity(event,{tripId:active});await waitForPersistence();return snapshot()}
  function removeEvent(id,options={}){const key=String(id||'');if(!key)return snapshot();const event=options.event||state.events.find(e=>String(e.id)===key)||{id:key,title:options.title||''};return removeByIdentity(event,options)}
  function snapshot(){return clone(state)}
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  const hydrateActiveLocal=()=>{const id=tripId();if(id)return refresh({tripId:id,force:true});return Promise.resolve(snapshot())};
  const api=Object.freeze({version:VERSION,refresh,hydrateLocal:hydrateActiveLocal,upsertRestaurant,upsertRestaurantAsync,updateRestaurantTime,upsertEvent,removeEvent,removeByIdentity,clearByType,waitForPersistence,snapshot,subscribe,analyze,travelMinutes,diagnostics:()=>({version:VERSION,persistenceKey:null,cloudAuthoritative:true,...snapshot(),trace:(state.events||[]).map(e=>({id:e.id,entityType:e.entityType,date:e.date,time:e.time,startAt:e.startAt,source:Boolean(e.source)}))})});
  window.LuviaScheduleIntelligence=api;
  window.addEventListener('luvia:trip-changed',()=>hydrateActiveLocal().catch(()=>{}));
  ['luvia:restaurant-lifecycle-changed','luvia:restaurant-imported','luvia:restaurants-v2-updated','luvia:travel-context-changed'].forEach(name=>window.addEventListener(name,()=>refresh().catch(()=>{})));
  window.addEventListener('luvia:auth-changed',e=>{if(e.detail?.authenticated!==false)hydrateActiveLocal().catch(()=>{})});
  window.addEventListener('online',()=>refresh({force:true,skipThrottle:true}).catch(()=>{}));
  const boot=()=>hydrateActiveLocal().catch(()=>{});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else queueMicrotask(boot);
})();
