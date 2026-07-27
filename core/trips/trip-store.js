(() => {
  'use strict';
  const listeners=new Set();let state={trips:[],activeTripId:null,loaded:false};
  const storage=()=>window.LuviaStorage;const migrator=()=>window.LuviaLegacyParisMigrator;
  const sort=items=>[...items].sort((a,b)=>(Date.parse(b.lastOpenedAt||b.updatedAt||b.createdAt||0)||0)-(Date.parse(a.lastOpenedAt||a.updatedAt||a.createdAt||0)||0));
  function persist({mirror=true}={}){storage().set(storage().keys.trips,state.trips);if(state.activeTripId)storage().setText(storage().keys.activeTripId,state.activeTripId);else storage().remove(storage().keys.activeTripId);if(mirror)migrator().mirror(state)}
  function snapshot(){const activeTrip=state.trips.find(t=>t.id===state.activeTripId)||null;return Object.freeze({trips:[...state.trips],activeTripId:state.activeTripId,activeTrip,hasTrips:state.trips.length>0,hasActiveTrip:Boolean(activeTrip),loaded:state.loaded})}
  function emit(reason='changed'){const value=snapshot();listeners.forEach(fn=>{try{fn(value)}catch(e){console.warn('[LuviaTripStore]',e)}});window.dispatchEvent(new CustomEvent('luvia:trips-changed',{detail:{...value,reason}}));document.dispatchEvent(new CustomEvent('luvia:trip-context-changed',{detail:value}));return value}
  function initialize(){const s=storage(),m=migrator();const canonical=s.get(s.keys.trips,[])||[];const legacy=m.readLegacy();const map=new Map();[...canonical,...legacy.trips].forEach(row=>{const trip=m.normalize(row);if(trip.id)map.set(trip.id,{...(map.get(trip.id)||{}),...trip})});state={trips:sort([...map.values()]),activeTripId:s.getText(s.keys.activeTripId,'')||legacy.activeTripId||null,loaded:true};if(state.activeTripId&&!state.trips.some(t=>t.id===state.activeTripId))state.activeTripId=null;persist();s.set(s.keys.migration,{completedAt:new Date().toISOString(),source:'legacy/paris'});return emit('initialized')}
  function reconcileLegacy(){const legacy=migrator().readLegacy();if(!legacy.trips.length&&!legacy.activeTripId)return snapshot();const map=new Map(state.trips.map(t=>[t.id,t]));legacy.trips.forEach(t=>map.set(t.id,{...(map.get(t.id)||{}),...t}));state.trips=sort([...map.values()]);if(legacy.activeTripId)state.activeTripId=legacy.activeTripId;persist();return emit('legacy-reconciled')}
  function upsert(input,{activate=false}={}){const trip=migrator().normalize(input);if(!trip.id)throw new Error('Reise-ID fehlt.');const index=state.trips.findIndex(t=>t.id===trip.id);if(index>=0){const current=state.trips[index];const destination={...(current.destination||{}),...(trip.destination||{})};for(const [key,value] of Object.entries(destination)){if(value===''||value==null){const previous=current.destination?.[key];if(previous!==''&&previous!=null)destination[key]=previous;}}state.trips[index]={...current,...trip,destination,destinationName:destination.name||trip.destinationName||current.destinationName};}else state.trips.push(trip);state.trips=sort(state.trips);if(activate)state.activeTripId=trip.id;persist();return emit('trip-upserted')}
  function setActive(id){if(!id){state.activeTripId=null;persist();return emit('trip-cleared')}const trip=state.trips.find(t=>t.id===id);if(!trip)throw new Error('Die ausgewählte Reise ist nicht verfügbar.');trip.lastOpenedAt=new Date().toISOString();state.activeTripId=id;state.trips=sort(state.trips);persist();document.dispatchEvent(new CustomEvent('reisezeit:trip-selected',{detail:migrator().toLegacy(trip)}));return emit('trip-selected')}
  async function loadRemote(client,{authoritative=true}={}){
    let rows=[];
    try{rows=await window.LuviaLegacyParisCloud.listTrips(client)}catch(error){
      if(!state.trips.length)throw error;
      console.warn('[LuviaTripStore] Remote-Liste nicht verfügbar, lokaler Cache bleibt als Offline-Fallback aktiv.',error);
      return snapshot();
    }
    const remote=sort((rows||[]).map(row=>migrator().normalize(row)).filter(t=>t.id));
    if(authoritative){
      const previousActive=state.activeTripId;
      state.trips=remote;
      state.activeTripId=remote.some(t=>t.id===previousActive)?previousActive:(remote[0]?.id||null);
      state.loaded=true;
      persist();
      return emit('remote-hydrated');
    }
    remote.forEach(row=>upsert(row));
    if(!state.activeTripId&&state.trips.length)state.activeTripId=state.trips[0].id;
    persist();
    return emit('remote-merged');
  }
  function clearActive(){return setActive(null)}
  window.LuviaTripStore=Object.freeze({initialize,reconcileLegacy,snapshot,upsert,setActive,clearActive,loadRemote,normalize:input=>migrator().normalize(input),subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn)}});
})();
