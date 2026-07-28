(function(){
'use strict';
const VERSION='4.1.3';
const KEY='luvia.timeline.v4';
let events=[];let realtime=null;const metrics={created:0,synced:0,queued:0,failed:0,lastError:null};
const now=()=>new Date().toISOString();
const id=()=>{try{return crypto.randomUUID();}catch{return`timeline-${Date.now()}-${Math.random().toString(36).slice(2)}`;}};
function load(){try{events=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(events))events=[];}catch{events=[];}return events;}
function persist(){localStorage.setItem(KEY,JSON.stringify(events.slice(-1000)));}
function normalize(raw={}){return Object.freeze({id:raw.id||id(),tripId:raw.tripId||null,placeId:raw.placeId||null,participantId:raw.participantId||null,type:raw.type||'place_event',title:raw.title||'Reiseereignis',description:raw.description||'',occurredAt:raw.occurredAt||now(),source:raw.source||'manual',automatic:Boolean(raw.automatic),metadata:{...(raw.metadata||{})},createdAt:raw.createdAt||now()});}
async function syncEvent(event){const client=window.LuviaSupabaseService?.getClient?.();if(!client||!navigator.onLine){metrics.queued++;return{queued:true};}try{const row={id:event.id,trip_id:event.tripId,place_id:event.placeId,participant_id:event.participantId,event_type:event.type,title:event.title,description:event.description,occurred_at:event.occurredAt,source:event.source,is_automatic:event.automatic,metadata:event.metadata,created_at:event.createdAt};const {error}=await client.from('timeline_events').upsert(row,{onConflict:'id'});if(error)throw error;metrics.synced++;return{synced:true};}catch(error){metrics.failed++;metrics.lastError=error.message;metrics.queued++;return{queued:true,error:error.message};}}
async function record(raw={}){const event=normalize(raw);if(!events.some(x=>x.id===event.id)){events.push(event);events.sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt));persist();metrics.created++;}await window.LuviaKernelEvents?.emit?.('timeline.event.created',event,{service:'timeline'});await syncEvent(event);return event;}
function list(filters={}){return events.filter(e=>(!filters.tripId||e.tripId===filters.tripId)&&(!filters.placeId||e.placeId===filters.placeId)&&(!filters.type||e.type===filters.type)).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt));}
async function flush(){for(const event of events)await syncEvent(event);return diagnostics();}
function subscribe(tripId){const client=window.LuviaSupabaseService?.getClient?.();if(!client||!tripId||realtime)return false;realtime=client.channel(`timeline:${tripId}`).on('postgres_changes',{event:'*',schema:'public',table:'timeline_events',filter:`trip_id=eq.${tripId}`},payload=>{const row=payload.new;if(!row)return;const event=normalize({id:row.id,tripId:row.trip_id,placeId:row.place_id,participantId:row.participant_id,type:row.event_type,title:row.title,description:row.description,occurredAt:row.occurred_at,source:row.source,automatic:row.is_automatic,metadata:row.metadata,createdAt:row.created_at});if(!events.some(x=>x.id===event.id)){events.push(event);persist();window.LuviaKernelEvents?.emit?.('timeline.event.realtime',event,{service:'timeline'});}}).subscribe();return true;}
async function init(){load();const tripId=window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.tripId||null;subscribe(tripId);return diagnostics();}
function diagnostics(){return{version:VERSION,status:'ready',eventCount:events.length,realtime:Boolean(realtime),metrics:{...metrics},recent:list().slice(0,20)};}
window.LuviaTimelineCore=Object.freeze({version:VERSION,init,record,list,flush,subscribe,diagnostics});
})();
