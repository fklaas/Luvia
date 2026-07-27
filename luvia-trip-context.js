(() => {
  'use strict';
  const listeners=new Set();
  const empty=()=>({trip:null,tripId:null,hasActiveTrip:false,tripName:'Unsere Reise',destination:null,destinationName:'',symbol:'❤️',accent:'#ee6f83',startDate:null,endDate:null,role:null,isOwner:false});
  function snapshot(){const source=window.LuviaTripStore?.snapshot?.();const trip=source?.activeTrip;if(!trip)return Object.freeze(empty());return Object.freeze({trip,tripId:trip.id,hasActiveTrip:true,tripName:trip.title||'Unsere Reise',destination:trip.destination||null,destinationName:trip.destination?.name||'',symbol:trip.symbol||'❤️',accent:trip.accent||'#ee6f83',startDate:trip.startDate||null,endDate:trip.endDate||null,role:trip.role||null,isOwner:Boolean(trip.isOwner||['owner','admin'].includes(trip.role))})}
  function emit(){const value=snapshot();listeners.forEach(fn=>{try{fn(value)}catch(e){console.warn('[LuviaTripContext]',e)}});return value}
  window.addEventListener('luvia:trips-changed',emit);
  window.LuviaTripContext=Object.freeze({getActiveTrip:()=>snapshot().trip,getDestination:()=>snapshot().destination,getDestinationName:()=>snapshot().destinationName,getTripName:()=>snapshot().tripName,getAccent:()=>snapshot().accent,getDates:()=>({startDate:snapshot().startDate,endDate:snapshot().endDate}),getSnapshot:snapshot,refresh(){window.LuviaTripStore?.reconcileLegacy?.();return emit()},subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn)}});
})();
