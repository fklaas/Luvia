(() => {
  'use strict';
  const VERSION='4.28.5.2';
  let running=null,watcherStarted=false,retryTimer=0;
  async function authenticated(){
    const state=window.ParisAuth?.getState?.();
    if(state?.authenticated&&state?.user?.id)return true;
    const client=window.LuviaSupabaseService?.getClient?.()||window.ParisSupabaseClient||window.ParisCloud?.client;
    try{return Boolean((await client?.auth?.getSession?.())?.data?.session?.user?.id)}catch{return false}
  }
  const onePosition=()=>new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:30000}));
  async function start(){
    if(!navigator.geolocation||!window.LuviaPresenceVisitCore)return{ok:false,reason:'unavailable'};
    if(running)return running;
    running=(async()=>{
      if(!(await authenticated()))return{ok:false,reason:'auth'};
      try{
        const permission=await navigator.permissions?.query?.({name:'geolocation'}).catch(()=>null);
        if(permission?.state==='denied')return{ok:false,reason:'denied'};
        const position=await onePosition();
        await window.LuviaPresenceVisitCore.ingestPosition(position);
        if(!watcherStarted){await window.LuviaPresenceVisitCore.setGlobalEnabled(true);watcherStarted=true}
        const detail=window.LuviaPresenceVisitCore.diagnostics();
        window.dispatchEvent(new CustomEvent('luvia:global-location-ready',{detail}));
        return{ok:true,detail};
      }catch(error){
        window.dispatchEvent(new CustomEvent('luvia:global-location-unavailable',{detail:{code:error?.code||null,message:error?.message||String(error)}}));
        return{ok:false,reason:error?.code===1?'denied':'error',error:error?.message||String(error)};
      }
    })();
    try{return await running}finally{running=null}
  }
  function schedule(delay=350){clearTimeout(retryTimer);retryTimer=setTimeout(()=>start().then(result=>{if(result?.reason==='auth')schedule(900)}),delay)}
  ['luvia:boot-complete','luvia:trip-changed','luvia:auth-changed','luvia:session-ready'].forEach(name=>window.addEventListener(name,()=>schedule()));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(250)});
  window.addEventListener('DOMContentLoaded',()=>{schedule(500);window.ParisAuth?.onChange?.(state=>{if(state?.authenticated)schedule(100)})},{once:true});
  window.LuviaGlobalLocationBootstrap=Object.freeze({version:VERSION,start,diagnostics:()=>({version:VERSION,running:Boolean(running),watcherStarted})});
})();
