(() => {
  'use strict';
  const listeners=new Set();let current=Object.freeze({phase:'booting',ready:false,auth:null,trips:null,error:null});
  const auth=()=>window.ParisAuth?.getState?.()||{loading:true,authenticated:false};
  function calculate(error=null){const a=auth();const trips=window.LuviaTripStore?.snapshot?.()||{loaded:false,hasTrips:false,hasActiveTrip:false};let phase='booting';if(error)phase='failed';else if(!a.loading&&!a.authenticated)phase='signed-out';else if(!a.loading&&a.authenticated&&trips.loaded&&!trips.hasTrips)phase='no-trips';else if(!a.loading&&a.authenticated&&trips.loaded&&!trips.hasActiveTrip)phase='trip-selection';else if(!a.loading&&a.authenticated&&trips.hasActiveTrip)phase='ready';current=Object.freeze({phase,ready:!['booting','failed'].includes(phase),auth:a,trips,error:error?String(error.message||error):null,updatedAt:new Date().toISOString()});listeners.forEach(fn=>{try{fn(current)}catch(e){console.warn('[LuviaRuntime]',e)}});window.dispatchEvent(new CustomEvent('luvia:runtime-changed',{detail:current}));return current}
  async function boot({client=null,refreshRemote=true}={}){try{window.LuviaTripStore.initialize();if(auth().authenticated&&refreshRemote)await window.LuviaTripStore.loadRemote(client);return calculate()}catch(error){console.error('[LuviaRuntime] Boot fehlgeschlagen',error);return calculate(error)}}
  function refresh(){return calculate()}
  document.addEventListener('paris:auth-changed',refresh);window.addEventListener('luvia:trips-changed',refresh);
  window.LuviaRuntime=Object.freeze({version:'2.13.0',boot,refresh,getSnapshot:()=>current,subscribe(fn){listeners.add(fn);fn(current);return()=>listeners.delete(fn)}});
})();
