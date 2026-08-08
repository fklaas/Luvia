(() => {
  'use strict';
  const VERSION='1.2.1';
  const listeners=new Set();
  let client=null,tripId=null,activityChannel=null,presenceChannel=null,heartbeatTimer=null,refreshTimer=null,started=false,watchPromise=null,watchToken=0;
  let unavailableUntil=0,heartbeatInFlight=false,heartbeatReadyAfter=0,sessionEpoch=0;
  const state={activities:[],presence:[],loaded:false,syncing:false,error:null,lastUpdatedAt:null,availability:'idle'};
  const DEVICE_KEY='luvia.device.id.v1';
  const deviceId=()=>{let id=localStorage.getItem(DEVICE_KEY);if(!id){id=(crypto.randomUUID?.()||`device-${Date.now()}-${Math.random().toString(36).slice(2)}`);localStorage.setItem(DEVICE_KEY,id)}return id};
  const profile=()=>window.LuviaProfileService?.snapshot?.().profile||{};
  const auth=()=>window.ParisAuth?.getState?.()||{};
  const snapshot=()=>Object.freeze({tripId,activities:structuredClone(state.activities),presence:structuredClone(state.presence),loaded:state.loaded,syncing:state.syncing,error:state.error,lastUpdatedAt:state.lastUpdatedAt,availability:state.availability});
  function emit(reason='changed'){const value=snapshot();listeners.forEach(fn=>{try{fn(value)}catch{}});window.dispatchEvent(new CustomEvent('luvia:collaboration-changed',{detail:{...value,reason}}));return value}
  function clearTimers(){if(heartbeatTimer)clearInterval(heartbeatTimer);if(refreshTimer)clearTimeout(refreshTimer);heartbeatTimer=refreshTimer=null}
  const networkReady=()=>navigator.onLine!==false&&(window.LuviaNetworkGuard?.canRequest?.()??true)&&Date.now()>=unavailableUntil;
  async function sessionReady(){if(!client?.auth?.getSession||!auth().authenticated)return false;try{const {data}=await client.auth.getSession();return Boolean(data?.session?.access_token)}catch{return false}}
  function markUnavailable(error){window.LuviaNetworkGuard?.markFailure?.(error,{cooldownMs:10000});unavailableUntil=Date.now()+10000;state.availability='degraded';state.error=null;}
  async function rpc(name,params){if(!networkReady())return {skipped:true,data:null};if(!await sessionReady())return {skipped:true,data:null};const r=await client.rpc(name,params);if(r.error)throw r.error;window.LuviaNetworkGuard?.markSuccess?.();return {skipped:false,data:r.data}}
  async function refresh({silent=false}={}){
    if(!client||!tripId||!auth().authenticated)return snapshot();
    if(!networkReady()||!await sessionReady()){state.syncing=false;state.availability=navigator.onLine===false?'offline':'auth-wait';return emit('refresh-skipped')}
    if(!silent){state.syncing=true;emit('refreshing')}
    try{
      const [activities,presence]=await Promise.all([rpc('luvia_list_trip_activity',{p_trip_id:tripId,p_limit:40}),rpc('luvia_list_trip_presence',{p_trip_id:tripId})]);
      if(activities.skipped||presence.skipped){state.syncing=false;return emit('refresh-skipped')}
      state.activities=activities.data||[];state.presence=presence.data||[];state.loaded=true;state.syncing=false;state.error=null;state.availability='online';state.lastUpdatedAt=new Date().toISOString();return emit('refreshed');
    }catch(error){state.loaded=true;state.syncing=false;markUnavailable(error);return emit('refresh-deferred')}
  }
  function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refresh({silent:true}),180)}
  async function heartbeat(){
    if(heartbeatInFlight||!client||!tripId||!auth().authenticated||document.visibilityState==='hidden'||!networkReady()||Date.now()<heartbeatReadyAfter)return;
    const epoch=sessionEpoch,currentTrip=tripId;heartbeatInFlight=true;
    try{
      if(!await sessionReady()||epoch!==sessionEpoch||currentTrip!==tripId)return;
      const result=await rpc('luvia_presence_heartbeat',{p_trip_id:currentTrip,p_device_id:deviceId(),p_display_name:profile().displayName||null,p_current_view:window.LuviaApp?.activeView?.()||'dashboard',p_metadata:{build:window.LuviaCoreVersion?.build||'unknown',platform:navigator.userAgentData?.platform||navigator.platform||'web'}});
      if(epoch===sessionEpoch&&currentTrip===tripId&&!result.skipped)state.availability='online';
    }catch(error){if(epoch===sessionEpoch)markUnavailable(error)}finally{heartbeatInFlight=false}
  }
  async function leave(){if(!client||!tripId||!auth().authenticated||!networkReady())return;try{await rpc('luvia_presence_leave',{p_trip_id:tripId,p_device_id:deviceId()})}catch{}}
  function subscribeRealtime(id){if(!client||typeof client.channel!=='function'||!id||!networkReady())return false;activityChannel=client.channel(`luvia-activity-${id}`).on('postgres_changes',{event:'*',schema:'public',table:'trip_activity_events',filter:`trip_id=eq.${id}`},scheduleRefresh).subscribe();presenceChannel=client.channel(`luvia-presence-${id}`).on('postgres_changes',{event:'*',schema:'public',table:'trip_presence',filter:`trip_id=eq.${id}`},scheduleRefresh).subscribe();return true}
  async function watchTrip(id){id=id||null;if(id===tripId&&activityChannel&&presenceChannel)return state.loaded?snapshot():refresh();const token=++watchToken;watchPromise=(async()=>{clearTimers();sessionEpoch++;heartbeatReadyAfter=Date.now()+1500;if(activityChannel)await client?.removeChannel?.(activityChannel);if(presenceChannel)await client?.removeChannel?.(presenceChannel);if(token!==watchToken)return snapshot();activityChannel=presenceChannel=null;tripId=id;state.activities=[];state.presence=[];state.loaded=false;state.error=null;state.availability='idle';if(!id)return emit('trip-cleared');emit('trip-changing');if(!await sessionReady()){state.availability='auth-wait';return emit('trip-auth-wait')}if(!subscribeRealtime(id)){state.availability=networkReady()?'realtime-unavailable':'offline';return refresh()}if(token!==watchToken)return snapshot();setTimeout(()=>{if(token===watchToken&&tripId===id)heartbeat()},1600);heartbeatTimer=setInterval(heartbeat,30000);return refresh()})();return watchPromise}
  async function record(eventType,title,{body=null,entityType=null,entityId=null,metadata={}}={}){if(!tripId)throw new Error('Keine aktive Reise.');if(!networkReady()||!await sessionReady())return null;try{const result=await rpc('luvia_record_trip_activity',{p_trip_id:tripId,p_event_type:eventType,p_title:title,p_body:body,p_entity_type:entityType,p_entity_id:entityId,p_metadata:{...metadata,actorName:metadata.actorName||profile().displayName||null}});if(!result.skipped)scheduleRefresh();return result.data}catch(error){markUnavailable(error);return null}}
  async function stop({keepClient=false}={}){clearTimers();sessionEpoch++;heartbeatReadyAfter=0;await leave();if(activityChannel)await client?.removeChannel?.(activityChannel);if(presenceChannel)await client?.removeChannel?.(presenceChannel);activityChannel=presenceChannel=null;tripId=null;state.activities=[];state.presence=[];state.loaded=false;state.availability='idle';if(!keepClient){client=null;started=false}return emit('stopped')}
  async function start(c){client=c||client||await window.LuviaSupabaseService.start();if(started)return snapshot();started=true;document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){heartbeat();scheduleRefresh()}else leave()});window.addEventListener('pagehide',()=>leave());window.addEventListener('online',()=>{unavailableUntil=0;sessionEpoch++;heartbeatReadyAfter=Date.now()+1200;state.availability='online';setTimeout(heartbeat,1300);scheduleRefresh()});window.addEventListener('offline',()=>{state.availability='offline';clearTimers();emit('offline')});window.addEventListener('luvia:auth-changed',()=>{unavailableUntil=0;sessionEpoch++;heartbeatReadyAfter=Date.now()+1500;if(tripId){scheduleRefresh();setTimeout(heartbeat,1600)}});window.addEventListener('luvia:restaurants-v2-updated',e=>{const detail=e.detail||{};if(detail.databaseEvent)return;if(detail.tripId&&detail.tripId===tripId)record('restaurant.updated',detail.entityImport?'Restaurant gespeichert':'Restaurantplanung aktualisiert',{entityType:'restaurant',metadata:{mode:detail.mode||null}})});window.addEventListener('luvia:trip-created',e=>{const t=e.detail?.trip;if(t?.id===tripId)record('trip.created','Reise wurde erstellt',{entityType:'trip',entityId:t.id})});window.addEventListener('luvia:trip-changed',e=>{const t=e.detail;if((t?.id||t?.tripId)===tripId)record('trip.updated','Reise wurde bearbeitet',{entityType:'trip',entityId:t.id||t.tripId})});return snapshot()}
  window.LuviaCollaboration=Object.freeze({version:VERSION,start,stop,watchTrip,refresh,heartbeat,record,snapshot,subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn)}});
})();
