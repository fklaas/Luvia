(() => {
  'use strict';
  const listeners=new Set();let activeScreen='dashboard';let last='';
  function snapshot(){const runtime=window.LuviaRuntime?.getSnapshot?.()||{phase:'booting',ready:false,auth:{},trips:{}};const trip=window.LuviaTripContext?.getSnapshot?.()||{};const value=Object.freeze({phase:runtime.phase,ready:runtime.ready,auth:runtime.auth||{},trip,hasTrip:Boolean(trip.tripId),officialTrip:Boolean(trip.trip?.templateId==='paris-official'||trip.trip?.isParisOfficial),modularTrip:Boolean(trip.tripId),unlocked:runtime.phase==='ready',activeScreen,error:runtime.error||null,updatedAt:new Date().toISOString()});return value}
  function emit(force=false){const value=snapshot();const signature=JSON.stringify([value.phase,value.trip.tripId,value.activeScreen,value.error]);if(!force&&signature===last)return value;last=signature;listeners.forEach(fn=>{try{fn(value)}catch(e){console.warn('[LuviaAppState]',e)}});window.dispatchEvent(new CustomEvent('luvia:app-state-changed',{detail:value}));return value}
  window.addEventListener('luvia:runtime-changed',()=>emit(true));window.addEventListener('luvia:trips-changed',()=>emit(true));
  window.LuviaAppState=Object.freeze({version:'2.13.0',getSnapshot:snapshot,refresh:()=>emit(true),setScreen(screen){activeScreen=String(screen||'dashboard');return emit(true)},subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn)}});
})();
