(() => {
  'use strict';
  const MIN_SPLASH_MS=1650;
  let startedAt=0,phase='idle',bootPromise=null,snapshot=null;
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const emit=(next,detail={})=>{phase=next;document.documentElement.dataset.luviaBoot=next;window.dispatchEvent(new CustomEvent('luvia:boot-phase',{detail:{phase:next,...detail}}));};
  function splash(){return document.getElementById('luviaBootSplash')}
  function begin(){if(phase!=='idle')return;startedAt=performance.now();document.documentElement.classList.add('lv-booting');emit('splash');}
  async function finish(){if(phase==='ready'||phase==='revealing')return;const remaining=Math.max(0,MIN_SPLASH_MS-(performance.now()-startedAt));if(remaining)await delay(remaining);const node=splash();emit('revealing');document.documentElement.classList.add('lv-boot-revealing');node?.setAttribute('aria-hidden','true');await delay(520);node?.remove();document.documentElement.classList.remove('lv-booting','lv-boot-revealing');emit('ready',{snapshot});}
  function chooseActiveTrip(){
    const trips=window.LuviaTripStore.snapshot().trips;
    const profile=window.LuviaProfileService.snapshot().profile||{};
    const cloudPreferred=profile.activeTripId;
    const chosen=trips.find(t=>String(t.id||t.tripId)===String(cloudPreferred||''))||trips[0]||null;
    if(chosen&&window.LuviaTripStore.snapshot().activeTripId!==chosen.id)window.LuviaTripStore.setActive(chosen.id,{touch:false,source:'boot-cloud'});
    return {trip:chosen,profile,needsProfileRepair:Boolean(chosen&&String(cloudPreferred||'')!==String(chosen.id||chosen.tripId||''))};
  }
  async function runAuthenticated(client){
    emit('cloud-profile');
    await Promise.all([
      window.LuviaTripStore.loadRemote(client,{authoritative:true,ignoreLocalActive:true}),
      window.LuviaProfileService.load(client)
    ]);
    const selected=chooseActiveTrip();
    if(selected.needsProfileRepair)await window.LuviaProfileService.setActiveTrip(selected.trip.id||selected.trip.tripId);
    const tripId=selected.trip?.id||selected.trip?.tripId||null;
    emit('cloud-snapshot',{tripId});
    if(tripId){
      await Promise.all([
        window.LuviaTripPlaceData?.hydrate?.(tripId),
        window.LuviaTimelineCore?.hydrate?.(tripId)
      ]);
    }
    snapshot=Object.freeze({auth:window.ParisAuth.getState(),profile:window.LuviaProfileService.snapshot(),trips:window.LuviaTripStore.snapshot(),tripId,completedAt:new Date().toISOString()});
    return snapshot;
  }
  async function boot(client){
    if(bootPromise)return bootPromise;
    begin();
    bootPromise=(async()=>{
      window.LuviaTripStore.initialize({silent:true});
      const auth=window.ParisAuth.getState();
      if(auth.authenticated)await runAuthenticated(client);
      else snapshot=Object.freeze({auth,profile:null,trips:window.LuviaTripStore.snapshot(),tripId:null,completedAt:new Date().toISOString()});
      emit('prepared',{snapshot});
      return snapshot;
    })().catch(error=>{emit('failed',{error});document.documentElement.classList.remove('lv-booting','lv-boot-revealing');throw error});
    return bootPromise;
  }
  function reset(){bootPromise=null;snapshot=null;phase='idle';}
  window.LuviaBootCoordinator=Object.freeze({version:'1.2.0',boot,reveal:finish,reset,get phase(){return phase},get snapshot(){return snapshot},get booting(){return !['ready','failed','idle'].includes(phase)}});
})();
