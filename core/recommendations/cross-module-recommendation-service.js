(() => {
  'use strict';
  const VERSION='4.1.0.2';
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const state={status:'ready',tripId:null,slots:{forYou:[],rightNow:[],nearby:[],onYourWay:[],next:[],alternative:[]},lastUpdatedAt:null,lastError:null};
  const tripId=()=>String(window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||'');
  function score(place){return Number(place?.intelligence?.score||place?.matchScore||0)}
  function distance(place){return Number.isFinite(Number(place?.distanceMeters))?Number(place.distanceMeters):Infinity}
  function build(restaurants=[]){
    const ranked=[...restaurants].sort((a,b)=>score(b)-score(a));
    const open=ranked.filter(x=>x.openNow!==false);
    const nearby=[...open].sort((a,b)=>distance(a)-distance(b));
    const schedule=window.LuviaScheduleIntelligence?.snapshot?.()||{};
    state.slots={
      forYou:ranked.slice(0,6),
      rightNow:open.slice(0,6),
      nearby:nearby.slice(0,6),
      onYourWay:nearby.filter(x=>distance(x)<5000).slice(0,6),
      next:schedule.next?ranked.filter(x=>String(x.id)!==String(schedule.next.id)).slice(0,4):ranked.slice(0,4),
      alternative:ranked.slice(1,5)
    };
    state.lastUpdatedAt=new Date().toISOString();state.lastError=null;
    window.dispatchEvent(new CustomEvent('luvia:cross-module-recommendations-changed',{detail:snapshot()}));
    return snapshot();
  }
  async function refresh(options={}){
    const id=String(options.tripId||tripId());state.tripId=id;
    try{
      const existing=window.LuviaRestaurantIntelligence?.snapshot?.()?.restaurants||[];
      if(existing.length)return build(existing);
      if(id&&window.LuviaRestaurants?.list){const r=await window.LuviaRestaurants.list({tripId:id});return build((r?.data?.entities||[]).map(window.LuviaRestaurants.entityToEntry).map(x=>window.LuviaRestaurantIntelligence?.enrich?.(x,[])||x));}
      return build([]);
    }catch(error){state.lastError=error?.message||String(error);return snapshot()}
  }
  function getSlot(name){return clone(state.slots[name]||[])}
  function snapshot(){return clone(state)}
  window.LuviaCrossModuleRecommendations=Object.freeze({version:VERSION,refresh,getSlot,snapshot,diagnostics:snapshot});
  ['luvia:restaurant-intelligence-changed','luvia:schedule-intelligence-changed','luvia:restaurants-v2-updated','luvia:travel-context-changed'].forEach(name=>window.addEventListener(name,()=>refresh().catch(()=>{})));
})();
