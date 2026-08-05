(() => {
'use strict';
const VERSION='5.3.8';
const calendarVisibleByTrip=new Map();const boundRoots=new WeakSet();
let state={tripId:null,loading:false,hydrated:false,entries:[],days:[],lastUpdatedAt:null,lastError:null,members:{},places:{}};
let channels=[];const listeners=new Set();
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const client=()=>window.LuviaSupabaseService?.getClient?.()||window.ParisSupabaseClient||window.ParisCloud?.client||null;
const activeTripId=()=>window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||null;
const iso=(d,t='00:00')=>new Date(`${d}T${String(t||'00:00').slice(0,5)}:00`).toISOString();
const dayKey=v=>new Date(v).toLocaleDateString('sv-SE');
const typeIcon=t=>({restaurant:'🍽️',accommodation:'🏨',attraction:'🏛️',activity:'🎟️',photo_spot:'📸',photo_memory:'📸',parking:'🅿️',charging:'🔌',shopping:'🛍️',nature:'🌿',mobility:'🚉'}[t]||'📍');
const fmtTime=v=>new Date(v).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
const fmtDate=v=>new Date(v).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
function scheduleEntry(r){const start=iso(r.event_date,r.start_time),duration=Number(r.duration_minutes||0);return{id:`schedule:${r.id}`,rowId:r.id,sourceKey:r.source_key,tripId:r.trip_id,placeId:r.place_id,tripPlaceId:r.trip_place_id,providerPlaceId:r.provider_place_id,entityType:r.entity_type||'place',kind:/check-in/i.test(r.title)?'check_in':/check-out/i.test(r.title)?'check_out':'planned',title:r.title,startAt:start,endAt:r.end_time?iso(r.event_date,r.end_time):(duration?new Date(new Date(start).getTime()+duration*60000).toISOString():null),durationMinutes:duration||null,automatic:false,source:'schedule',metadata:r.metadata||{},icon:typeIcon(r.entity_type)}}
function dataEntry(e){return{id:e.id,rowId:null,sourceKey:e.id,tripId:e.tripId,placeId:e.placeId,tripPlaceId:e.tripPlaceId,providerPlaceId:e.record?.place?.provider_place_id||null,entityType:e.placeType,kind:e.kind,title:e.title,startAt:e.startAt,endAt:null,durationMinutes:null,automatic:false,source:'place-data',dataKey:e.dataKey,fields:e.fields||{},metadata:{placeName:e.record?.place?.name||''},icon:typeIcon(e.placeType)}}
function eventEntry(r){const photoMemory=r.event_type==='photo_memory';return{id:`event:${r.id}`,rowId:r.id,sourceKey:r.id,tripId:r.trip_id,placeId:r.place_id,tripPlaceId:r.trip_place_id||r.metadata?.tripPlaceId,providerPlaceId:null,entityType:photoMemory?'photo_memory':(r.metadata?.placeType||'place'),kind:r.event_type,title:r.title,startAt:r.occurred_at,endAt:null,durationMinutes:null,automatic:Boolean(r.is_automatic),source:'event',description:r.description||'',metadata:r.metadata||{},icon:photoMemory?'📸':typeIcon(r.metadata?.placeType)}}
function visitEntry(r){const p=state.places[r.place_id]||{},name=state.members[r.participant_id]||'Mitreisender';return{id:`visit:${r.id}`,rowId:r.id,sourceKey:r.id,tripId:r.trip_id,placeId:r.place_id,tripPlaceId:r.trip_place_id,providerPlaceId:p.provider_place_id,entityType:p.primary_type||r.metadata?.placeType||'place',kind:'visited',title:p.name||r.metadata?.placeName||'Besuchter Ort',startAt:r.arrived_at,endAt:r.left_at,durationMinutes:Math.max(5,Math.round(Number(r.duration_seconds||0)/60)),automatic:true,source:'gps',participantId:r.participant_id,participantName:name,metadata:r.metadata||{},icon:typeIcon(p.primary_type)}}
function dedupe(list){const seen=new Map();for(const e of list){const key=e.source==='place-data'?`pd:${e.tripPlaceId}:${e.dataKey}`:e.source==='schedule'?`s:${e.sourceKey}`:e.source==='gps'?`v:${e.sourceKey}`:`e:${e.sourceKey}`;seen.set(key,e)}return [...seen.values()].sort((a,b)=>new Date(a.startAt)-new Date(b.startAt))}
function buildDays(entries){const map=new Map();for(const e of entries){const key=dayKey(e.startAt);if(!map.has(key))map.set(key,[]);map.get(key).push(e)}return [...map.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,items])=>({date,items,hasAutomatic:items.some(x=>x.automatic),count:items.length}))}
function emit(){state.days=buildDays(state.entries);state.lastUpdatedAt=new Date().toISOString();const snap=snapshot();listeners.forEach(fn=>{try{fn(snap)}catch{}});window.dispatchEvent(new CustomEvent('luvia:timeline-changed',{detail:snap}));window.dispatchEvent(new CustomEvent('luvia:timeline-cloud-changed',{detail:snap}))}
async function hydrate(tripId=activeTripId()){
 state.tripId=tripId||null;state.loading=true;state.hydrated=false;state.lastError=null;
 if(!tripId){state.entries=[];state.loading=false;state.hydrated=true;emit();return snapshot()}
 const database=client();if(!database?.from){state.loading=false;state.lastError='Keine Cloud-Verbindung für Timeline verfügbar.';emit();throw new Error(state.lastError)}
 try{
  await window.LuviaTripPlaceData?.hydrate?.(tripId);
  const [scheduleRows,eventRows,visitRows,tripPlaces,members]=await Promise.all([
   database.from('trip_schedule_events').select('*').eq('trip_id',tripId).order('event_date').order('start_time'),
   database.from('timeline_events').select('*').eq('trip_id',tripId).order('occurred_at'),
   database.from('place_visits').select('*').eq('trip_id',tripId).order('arrived_at'),
   database.from('trip_places').select('id,place_id,module_key,status').eq('trip_id',tripId).neq('status','archived'),
   database.from('trip_members').select('*').eq('trip_id',tripId)
  ]);
  for(const result of [scheduleRows,eventRows,visitRows,tripPlaces,members])if(result.error)throw result.error;
  const linked=new Set((tripPlaces.data||[]).map(x=>x.place_id).filter(Boolean));
  const placeIds=[...new Set([...(scheduleRows.data||[]).map(x=>x.place_id),...(eventRows.data||[]).map(x=>x.place_id),...(visitRows.data||[]).map(x=>x.place_id)].filter(Boolean))];state.places={};
  if(placeIds.length){const pr=await database.from('places').select('*').in('id',placeIds);if(pr.error)throw pr.error;for(const place of pr.data||[])state.places[place.id]=place}
  state.members={};for(const member of members.data||[]){const id=member.user_id||member.participant_id||member.id,name=member.display_name||member.member_name||member.name||member.email||'Mitreisender';state.members[id]=name;state.members[member.id]=name}
  const allowedEvents=new Set(['place_visited','manual_note','memory','trip_moment','photo_memory']);
  const validVisits=(visitRows.data||[]).filter(x=>linked.has(x.place_id)&&x.arrived_at&&Number(x.duration_seconds||0)>=300&&['visited','left'].includes(x.state));
  const placeData=(window.LuviaTripPlaceData?.dateEntries?.()||[]).filter(entry=>entry.placeType!=='mobility');
  const schedule=(scheduleRows.data||[]).filter(row=>!['accommodation','mobility'].includes(String(row.entity_type)));
  state.entries=dedupe([...placeData.map(dataEntry),...schedule.map(scheduleEntry),...(eventRows.data||[]).filter(x=>allowedEvents.has(x.event_type)).map(eventEntry),...validVisits.map(visitEntry)]);
  state.loading=false;state.hydrated=true;emit();return snapshot();
 }catch(error){state.loading=false;state.hydrated=false;state.lastError=error.message||String(error);emit();throw error}
}
async function record(raw={}){const db=client(),tripId=raw.tripId||state.tripId||activeTripId();if(!db?.from||!tripId)throw new Error('Timeline-Cloud nicht verfügbar.');const row={trip_id:tripId,place_id:raw.placeId||null,participant_id:raw.participantId||null,event_type:raw.type||'manual_note',title:raw.title||'Reiseereignis',description:raw.description||'',occurred_at:raw.occurredAt||new Date().toISOString(),source:raw.source||'manual',is_automatic:Boolean(raw.automatic),metadata:raw.metadata||{}};const {error}=await db.from('timeline_events').insert(row);if(error)throw error;return hydrate(tripId)}
async function removeEntry(identity,{tripId=state.tripId||activeTripId()}={}){
 const entry=typeof identity==='string'?state.entries.find(item=>String(item.id)===String(identity)):identity;
 if(!entry||!tripId)throw new Error('Timeline-Eintrag wurde nicht gefunden.');
 const database=client();if(!database?.from)throw new Error('Keine Cloud-Verbindung für Timeline verfügbar.');
 if(entry.source==='place-data'){
  if(!entry.tripPlaceId||!entry.dataKey)throw new Error('Der Place-Datensatz ist unvollständig.');
  await window.LuviaTripPlaceData.updateDateFields(entry.tripPlaceId,{[entry.dataKey]:null},{tripId});
 }else if(entry.source==='schedule'){
  let query=database.from('trip_schedule_events').delete().eq('trip_id',tripId);
  if(entry.rowId)query=query.eq('id',entry.rowId);else if(entry.sourceKey)query=query.eq('source_key',entry.sourceKey);else throw new Error('Der Cloud-Schlüssel des Planeintrags fehlt.');
  const {error}=await query;if(error)throw error;
 }else if(entry.source==='event'){
  const {error}=await database.from('timeline_events').delete().eq('trip_id',tripId).eq('id',entry.rowId);if(error)throw error;
 }else if(entry.source==='gps'){
  const {error}=await database.from('place_visits').delete().eq('trip_id',tripId).eq('id',entry.rowId);if(error)throw error;
 }
 await Promise.all([hydrate(tripId),window.LuviaScheduleIntelligence?.refresh?.({tripId,force:true,skipThrottle:true})]);
 window.dispatchEvent(new CustomEvent('luvia:place-plan-changed',{detail:{tripId,type:entry.entityType,tripPlaceId:entry.tripPlaceId,removed:true}}));
 window.dispatchEvent(new CustomEvent('luvia:in-window-data-changed',{detail:{tripId,placeType:entry.entityType,tripPlaceId:entry.tripPlaceId,removed:true}}));
 return true;
}
async function clearEntries({entityType,tripId=state.tripId||activeTripId()}={}){
 const entries=state.entries.filter(entry=>!entityType||entry.entityType===entityType).filter(entry=>['place-data','schedule'].includes(entry.source));
 for(const entry of entries)await removeEntry(entry,{tripId});
 return snapshot();
}
function snapshot(){return clone(state)}
function list(filter={}){return state.entries.filter(e=>(!filter.tripId||String(e.tripId)===String(filter.tripId))&&(!filter.entityType||e.entityType===filter.entityType))}
function entriesForDate(date){return state.entries.filter(e=>dayKey(e.startAt)===date)}
function dateRange(trip){const candidates=[trip?.startDate,trip?.endDate,state.days[0]?.date,state.days.at(-1)?.date].filter(Boolean).map(v=>new Date(v));const valid=candidates.filter(d=>!Number.isNaN(d.getTime()));const start=valid.length?new Date(Math.min(...valid)):new Date(),end=valid.length?new Date(Math.max(...valid)):new Date(start),out=[];for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1))out.push(new Date(d));return out.slice(0,62)}
function calendarTripKey(trip){return String(trip?.id||trip?.tripId||state.tripId||'active')}
function calendarVisibleCount(trip,total){const key=calendarTripKey(trip),stored=Number(calendarVisibleByTrip.get(key)||7);return Math.max(7,Math.min(total||7,stored))}
function renderCalendar(trip,esc=s=>String(s)){const range=dateRange(trip),marked=new Map(state.days.map(d=>[d.date,d])),visible=calendarVisibleCount(trip,range.length),expanded=range.length>7&&visible>=range.length;return `<div class="lv-trip-calendar" data-calendar-trip="${calendarTripKey(trip)}" data-calendar-visible="${visible}"><div class="lv-widget-title"><div><h2>Reise-Timeline</h2><small>Alle geplanten und tatsächlich besuchten Orte aus der Cloud.</small></div><span>${state.entries.length} Einträge</span></div><div class="lv-calendar-grid">${range.map((d,index)=>{const key=d.toLocaleDateString('sv-SE'),day=marked.get(key);return `<button type="button" class="lv-calendar-day ${day?'has-events':''} ${index>=visible?'is-calendar-hidden':''}" data-calendar-index="${index}" data-timeline-date="${key}"><span>${d.toLocaleDateString('de-DE',{weekday:'short'})}</span><strong>${d.getDate()}</strong><small>${d.toLocaleDateString('de-DE',{month:'short'})}</small>${day?`<em>${day.count}</em>`:''}</button>`}).join('')}</div>${range.length>7?`<button type="button" class="lv-calendar-more" data-timeline-more>${expanded?'Weniger Tage anzeigen':'Weitere Tage anzeigen'}</button>`:''}<div class="lv-calendar-hint">Datum auswählen, um den Tagesablauf zu öffnen.</div></div>`}
function stayText(e,allItems){if(e.kind==='photo_memory')return `${e.metadata?.mediaIds?.length||0} Fotos · Erinnerung`;if(e.kind==='check_in'){const out=state.entries.find(x=>x.kind==='check_out'&&x.tripPlaceId===e.tripPlaceId&&new Date(x.startAt)>=new Date(e.startAt));return out?`Aufenthalt bis ${fmtDate(out.startAt)}, ${fmtTime(out.startAt)} Uhr`:'Check-out noch offen'}if(e.kind==='check_out')return 'Ende des Aufenthalts';if(e.source==='gps')return `${e.durationMinutes||5} Min. Aufenthalt · GPS · ${e.participantName}`;return e.durationMinutes?`${Math.round(e.durationMinutes)} Min. geplant`:'Geplant'}
async function openPhotoMemory(e,node){
 node?.remove?.();const mediaIds=e.metadata?.mediaIds||[],clusterId=e.metadata?.clusterId||null,modal=document.createElement('div');modal.className='lv-timeline-modal lv-photo-memory-modal';modal.innerHTML=`<div class="lv-timeline-backdrop" data-close-photo-memory></div><section class="lv-timeline-sheet lv-photo-memory-sheet"><button data-close-photo-memory class="lv-timeline-close">×</button><span class="lv-kicker">📸 Reiseerinnerung</span><h2>${String(e.title||'Gemeinsamer Fotomoment')}</h2><p>${String(e.description||'Ein gemeinsamer Fotomoment aus eurer Reise.')}</p><div class="lv-photo-memory-collage" data-photo-memory-collage><span>Fotos werden geladen …</span></div><div class="lv-photo-memory-meta"><b>${mediaIds.length} Foto${mediaIds.length===1?'':'s'}</b><span>${fmtDate(e.startAt)}, ${fmtTime(e.startAt)} Uhr</span></div><button type="button" class="lv-photo-memory-gallery" data-open-memory-gallery>In der Galerie öffnen</button></section>`;document.body.appendChild(modal);modal.querySelectorAll('[data-close-photo-memory]').forEach(x=>x.onclick=()=>modal.remove());modal.querySelector('[data-open-memory-gallery]').onclick=()=>{modal.remove();window.dispatchEvent(new CustomEvent('luvia:navigate-request',{detail:{view:'gallery',clusterId}}));};
 try{const all=await window.LuviaMediaCore?.list?.({type:'image'})||[],selected=all.filter(x=>mediaIds.includes(x.id)).slice(0,8),collage=modal.querySelector('[data-photo-memory-collage]');if(!selected.length){collage.innerHTML='<span>Keine Fotos mehr mit diesem Moment verknüpft.</span>';return modal}collage.innerHTML=selected.map(x=>`<i data-memory-photo="${x.id}"></i>`).join('');for(const item of selected){const url=await window.LuviaMediaCore.signedUrl(item,900).catch(()=>null),el=collage.querySelector(`[data-memory-photo="${CSS.escape(item.id)}"]`);if(url&&el)el.style.backgroundImage=`url("${url}")`}}catch(error){const collage=modal.querySelector('[data-photo-memory-collage]');if(collage)collage.innerHTML='<span>Fotos konnten nicht geladen werden.</span>'}return modal
}
function openPlace(e,node){
 const payload={type:e.entityType,placeId:e.placeId,tripPlaceId:e.tripPlaceId,providerPlaceId:e.providerPlaceId,title:String(e.title||'').replace(/^.*?·\s*/,''),returnView:'timeline',overlayOnly:true,seedPlace:state.places[e.placeId]||null};
 node?.querySelectorAll?.('[data-open-entry]').forEach(button=>{button.disabled=true;button.classList.add('is-opening');if(button.textContent.trim()==='Place öffnen')button.textContent='Öffnet …'});
 node?.remove?.();
 window.dispatchEvent(new CustomEvent('luvia:open-place-request',{detail:payload}));
}
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid=v=>UUID_RE.test(String(v||'').trim())?String(v).trim():null;
function localParts(value){if(!value)return{date:'',time:''};const d=new Date(value);if(Number.isNaN(d.getTime()))return{date:'',time:''};return{date:d.toLocaleDateString('sv-SE'),time:d.toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit',hour12:false}).slice(0,5)}}
function toIso(date,time){const value=new Date(`${date}T${time}:00`);if(Number.isNaN(value.getTime()))throw new Error('Datum und Uhrzeit sind ungültig.');return value.toISOString()}
function isPlaceDataEntry(e={}){return e.source==='place-data'||Boolean((e.tripPlaceId||e.record?.trip_place_id)&&(e.dataKey||e.record||e.placeType||e.entityType))}
function placeDataContext(e={}){
 const hinted=e.tripPlaceId||e.record?.trip_place_id||e.record?.tripPlace?.id||null;
 const record=window.LuviaTripPlaceData?.recordForTripPlace?.(hinted)||e.record||null;
 const resolvedTripId=uuid(e.tripId||record?.trip_id||state.tripId||activeTripId());
 const resolvedTripPlaceId=uuid(hinted||record?.trip_place_id);
 const placeType=String(e.entityType||e.placeType||record?.place_type||'place').trim();
 const contract=window.LuviaPlaceTypeContracts?.get?.(placeType)||null;
 const contractFields=window.LuviaPlaceTypeContracts?.timelineFields?.(placeType)||[];
 const fallbackKey=e.dataKey||contractFields[0]?.key||'planned_at';
 const definitions=(contractFields.length?contractFields:[{key:fallbackKey,label:'Datum und Uhrzeit',timelineRole:'point'}]).map(field=>({key:field.key,label:field.label||'Datum und Uhrzeit',timelineRole:field.timelineRole||'point'}));
 if(!resolvedTripId)throw new Error('Die aktive Reise konnte nicht eindeutig aufgelöst werden. Bitte die Reise erneut öffnen.');
 if(!resolvedTripPlaceId)throw new Error('Die Place-Verknüpfung ist unvollständig. Bitte den Ort neu öffnen und erneut versuchen.');
 if(!placeType||placeType==='place')throw new Error('Der Place-Typ konnte nicht eindeutig bestimmt werden.');
 return{tripId:resolvedTripId,tripPlaceId:resolvedTripPlaceId,placeId:uuid(e.placeId||record?.place_id||record?.place?.id),placeType,record,contract,definitions,fields:record?.fields||e.fields||{},title:record?.place?.name||String(e.title||'').replace(/^.*?·\s*/,''),icon:contract?.identity?.icon||e.icon||typeIcon(placeType)};
}
function editorAccent(node){const accent=getComputedStyle(document.documentElement).getPropertyValue('--lv-accent').trim()||'#ee6f83';node.style.setProperty('--rv2-accent',accent);node.style.setProperty('--place-accent',accent)}
function openPlanningEditor({title,icon='',definitions=[],fields={},eyebrow='Datum und Uhrzeit',description='Datum und Uhrzeit werden direkt in eure gemeinsame Reiseplanung übernommen.',submitLabel='Änderungen speichern',save}={},onDone){
 document.querySelectorAll('[data-luvia-place-plan-editor],.lv-time-editor').forEach(x=>x.remove());
 const node=document.createElement('div');node.className='rv2-plan-backdrop';node.dataset.luviaPlacePlanEditor='true';editorAccent(node);
 const viewFields=definitions.map(def=>({...def,...localParts(fields?.[def.key])}));
 node.innerHTML=window.LuviaPlaceExperience?.planningEditor?.({eyebrow,title:`${icon||''} ${title||'Datum und Uhrzeit'}`.trim(),description,fields:viewFields,submitLabel})||'';
 document.body.appendChild(node);document.body.classList.add('luvia-place-overlay-open');
 const form=node.querySelector('[data-luvia-place-plan-form]'),message=node.querySelector('[data-place-plan-message]'),submit=form?.querySelector('[type="submit"]');
 const close=()=>{node.remove();document.body.classList.remove('luvia-place-overlay-open')};
 node.addEventListener('click',event=>{if(event.target===node||event.target.closest('[data-close-place-plan]'))close()});
 node.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close()}});
 form?.addEventListener('submit',async event=>{event.preventDefault();if(submit?.disabled)return;const updates={};try{
   for(const group of form.querySelectorAll('[data-plan-field]')){const key=group.dataset.planField,date=group.querySelector('[data-plan-date]')?.value||'',time=group.querySelector('[data-plan-time]')?.value||'';if(Boolean(date)!==Boolean(time))throw new Error(`Bitte für „${group.querySelector('legend')?.textContent||'Datum und Uhrzeit'}“ Datum und Uhrzeit vollständig angeben.`);updates[key]=date&&time?toIso(date,time):null}
   if(submit){submit.disabled=true;submit.textContent='Wird gespeichert …'}if(message)message.textContent='';await save(updates);if(message)message.textContent='Gespeichert.';setTimeout(()=>{close();onDone?.(updates)},180)
  }catch(error){if(submit){submit.disabled=false;submit.textContent=submitLabel}if(message)message.textContent=error?.message||'Die Änderungen konnten nicht gespeichert werden.';window.LuviaUIKit?.toast?.(error?.message||'Die Änderungen konnten nicht gespeichert werden.',{type:'error'})}});
 queueMicrotask(()=>form?.querySelector('input')?.focus());return node;
}
function editPlaceDates(e,onDone){let context;try{context=placeDataContext(e)}catch(error){window.LuviaUIKit?.toast?.(error.message,{type:'error'});return null}return openPlanningEditor({title:context.title,icon:context.icon,definitions:context.definitions,fields:context.fields,description:context.placeType==='accommodation'?'Check-in und Check-out werden direkt in eure gemeinsame Reiseplanung übernommen.':'Datum und Uhrzeit werden direkt in euren Tagesplan übernommen.',save:async updates=>{const writer=window.LuviaPlaceCollections?.saveDateFields;if(typeof writer==='function')await writer({tripId:context.tripId,placeType:context.placeType,tripPlaceId:context.tripPlaceId,placeId:context.placeId,fields:updates});else await window.LuviaTripPlaceData.upsert({tripId:context.tripId,tripPlaceId:context.tripPlaceId,placeId:context.placeId,placeType:context.placeType,fields:updates});await hydrate(context.tripId);window.dispatchEvent(new CustomEvent('luvia:place-plan-changed',{detail:{tripId:context.tripId,type:context.placeType,tripPlaceId:context.tripPlaceId}}));window.dispatchEvent(new CustomEvent('luvia:in-window-data-changed',{detail:{tripId:context.tripId,placeType:context.placeType,tripPlaceId:context.tripPlaceId}}))}},onDone)}
function editLegacySchedule(e,onDone){const rowId=uuid(e?.rowId),trip=uuid(e?.tripId||state.tripId||activeTripId());if(!rowId||!trip){window.LuviaUIKit?.toast?.('Der Cloud-Schlüssel dieses Planeintrags fehlt. Bitte die Timeline neu laden.',{type:'error'});return null}return openPlanningEditor({title:e.title||'Datum und Uhrzeit',icon:e.icon||'',definitions:[{key:'planned_at',label:'Datum und Uhrzeit'}],fields:{planned_at:e.startAt},save:async updates=>{const parts=localParts(updates.planned_at);if(!parts.date||!parts.time)throw new Error('Datum und Uhrzeit dürfen bei diesem älteren Planeintrag nicht leer sein.');const {error}=await client().from('trip_schedule_events').update({event_date:parts.date,start_time:parts.time,updated_at:new Date().toISOString()}).eq('id',rowId).eq('trip_id',trip);if(error)throw error;await hydrate(trip);window.dispatchEvent(new CustomEvent('luvia:place-plan-changed',{detail:{tripId:trip,type:e.entityType,tripPlaceId:e.tripPlaceId}}));window.dispatchEvent(new CustomEvent('luvia:in-window-data-changed',{detail:{tripId:trip,placeType:e.entityType,tripPlaceId:e.tripPlaceId}}))}},onDone)}
function editEntry(e,onDone){return isPlaceDataEntry(e)?editPlaceDates(e,onDone):editLegacySchedule(e,onDone)}
function popup(date){const items=entriesForDate(date),providerIds=items.map(item=>item.providerPlaceId).filter(Boolean);items.filter(item=>item.providerPlaceId).forEach(item=>window.LuviaPlaceDetails?.prepare?.(item.providerPlaceId,{regionCode:'DE',photoLimit:1,seedPlace:state.places[item.placeId]||null}).catch(()=>{}));const node=document.createElement('div');node.className='lv-timeline-modal';node.innerHTML=`<div class="lv-timeline-backdrop" data-close-timeline></div><section class="lv-timeline-sheet"><button data-close-timeline class="lv-timeline-close">×</button><span class="lv-kicker">${new Date(`${date}T12:00:00`).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long'})}</span><h2>Euer Tag</h2><div class="lv-day-timeline">${items.length?items.map((e,i)=>{const memory=e.kind==='photo_memory';return `<article class="lv-day-entry ${memory?'is-photo-memory':''}"><div class="lv-day-time">${fmtTime(e.startAt)}</div><div class="lv-day-line"><i></i></div><button type="button" class="lv-day-place" data-open-entry="${e.id}"><span>${e.icon}</span><div><strong>${e.title}</strong><small>${stayText(e,items)}</small>${memory?'<em>Bestätigter Fotomoment</em>':e.source==='gps'?`<em>GPS · ${e.participantName}</em>`:''}</div></button><div class="lv-day-entry-actions"><button type="button" data-open-entry="${e.id}">${memory?'Erinnerung öffnen':'Place öffnen'}</button>${['schedule','place-data'].includes(e.source)?`<button type="button" data-edit-entry="${e.id}">Datum und Uhrzeit ändern</button>`:''}</div>${i<items.length-1?`<div class="lv-day-transfer">↳ Weiter zum nächsten ${memory?'Moment':'Ort'}</div>`:''}</article>`}).join(''):'<p>Noch keine Einträge für diesen Tag.</p>'}</div></section>`;document.body.appendChild(node);node.querySelectorAll('[data-close-timeline]').forEach(x=>x.onclick=()=>node.remove());node.querySelectorAll('[data-open-entry]').forEach(x=>x.onclick=ev=>{ev.preventDefault();ev.stopPropagation();const e=items.find(v=>v.id===x.dataset.openEntry);if(e){if(e.kind==='photo_memory')openPhotoMemory(e,node);else openPlace(e,node)}});node.querySelectorAll('[data-edit-entry]').forEach(x=>x.onclick=ev=>{ev.preventDefault();ev.stopPropagation();const e=items.find(v=>v.id===x.dataset.editEntry);if(e)editEntry(e,updates=>{node.remove();const next=Object.values(updates||{}).find(Boolean)||e.startAt;popup(dayKey(next))})});return node}
function bindCalendar(root=document){
 if(!root||boundRoots.has(root))return;boundRoots.add(root);
 const warm=event=>{const day=event.target.closest?.('[data-timeline-date]');if(!day||!root.contains(day))return;const ids=entriesForDate(day.dataset.timelineDate).map(item=>item.providerPlaceId).filter(Boolean);if(ids.length)window.LuviaPlaceDetails?.prefetch?.(ids,{regionCode:'DE'})};
 root.addEventListener('pointerover',warm,{passive:true});root.addEventListener('focusin',warm);
 root.addEventListener('click',event=>{const day=event.target.closest?.('[data-timeline-date]');if(day&&root.contains(day)){event.preventDefault();event.stopPropagation();popup(day.dataset.timelineDate);return}const button=event.target.closest?.('[data-timeline-more]');if(!button||!root.contains(button))return;event.preventDefault();event.stopPropagation();const calendar=button.closest('.lv-trip-calendar');if(!calendar)return;const days=[...calendar.querySelectorAll('.lv-calendar-day')],tripKey=calendar.dataset.calendarTrip||String(state.tripId||'active'),current=Math.max(7,Number(calendar.dataset.calendarVisible||7)),next=current>=days.length?7:Math.min(days.length,current+7);calendarVisibleByTrip.set(tripKey,next);calendar.dataset.calendarVisible=String(next);days.forEach((item,index)=>item.classList.toggle('is-calendar-hidden',index>=next));button.textContent=next>=days.length?'Weniger Tage anzeigen':'Weitere Tage anzeigen'});
}
function subscribeRealtime(tripId=state.tripId){channels.forEach(c=>{try{client()?.removeChannel(c)}catch{}});channels=[];const db=client();if(!db||!tripId)return false;for(const table of ['trip_schedule_events','timeline_events','place_visits','trip_place_data'])channels.push(db.channel(`timeline-v52:${table}:${tripId}`).on('postgres_changes',{event:'*',schema:'public',table,filter:`trip_id=eq.${tripId}`},()=>hydrate(tripId).catch(()=>{})).subscribe());return true}
function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
async function init(){const id=activeTripId();await window.LuviaTripPlaceData?.init?.();await hydrate(id).catch(()=>{});subscribeRealtime(id);return diagnostics()}
function diagnostics(){return{version:VERSION,status:state.hydrated?'ready':'loading',cloudAuthoritative:true,localPersistence:false,tripId:state.tripId,hydrated:state.hydrated,loading:state.loading,eventCount:state.entries.length,days:state.days.length,realtimeChannels:channels.length,realtime:channels.length>0,metrics:{queued:0},lastError:state.lastError,placeDataSource:'trip_place_data',gpsRules:{linkedPlacesOnly:true,minStaySeconds:300,states:['visited','left']}}}
window.addEventListener('luvia:trip-changed',e=>{const id=e.detail?.tripId||e.detail?.id||activeTripId();if(!id)return;hydrate(id).then(()=>{if(activeTripId()===id)subscribeRealtime(id)}).catch(()=>{})});window.addEventListener('luvia:place-plan-changed',()=>hydrate().catch(()=>{}));window.addEventListener('luvia:place-visit-changed',()=>hydrate().catch(()=>{}));window.addEventListener('luvia:memory-bridge-applied',e=>hydrate(e.detail?.tripId||activeTripId()).catch(()=>{}));
window.LuviaTimelineCore=Object.freeze({version:VERSION,init,hydrate,record,removeEntry,clearEntries,snapshot,list,entriesForDate,renderCalendar,bindCalendar,popup,openPhotoMemory,openPlanningEditor,editEntry,subscribe,diagnostics});
})();