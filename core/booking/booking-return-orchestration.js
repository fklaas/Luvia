(() => {
  'use strict';
  const VERSION='1.0.0';
  let client=null;
  const runs=new Map();
  async function init(){
    client=client||await window.LuviaSupabaseService.start();
    return api;
  }
  async function reconcileTrip(tripId,{limit=50,source='bookings_view'}={}){
    await init();
    if(!tripId)return {ok:false,reason:'TRIP_REQUIRED'};
    if(runs.has(tripId))return runs.get(tripId);
    const job=(async()=>{
      const {data,error}=await client.rpc('luvia_booking_reconcile_trip_returns',{p_trip_id:tripId,p_limit:limit,p_source:source});
      if(error)throw error;
      return data||{ok:true};
    })().finally(()=>runs.delete(tripId));
    runs.set(tripId,job);
    return job;
  }
  async function summary(bookingId){
    await init();
    const {data,error}=await client.from('booking_return_orchestration_summary').select('*').eq('booking_id',bookingId).maybeSingle();
    if(error)throw error;
    return data;
  }
  const semantics=()=>Object.freeze({
    exactReferenceBeforeStatusApplication:true,
    unknownProviderStatusRequiresReview:true,
    commercialSignalsCanConfirmReservation:false,
    conversionCommissionRemainSeparateFromBookingStatus:true,
    pendingReturnsAreEventuallyReprocessed:true
  });
  const api=Object.freeze({version:VERSION,init,reconcileTrip,summary,semantics,diagnostics:()=>({version:VERSION,pendingTripRuns:runs.size,...semantics()})});
  window.LuviaBookingReturnOrchestration=api;
})();
