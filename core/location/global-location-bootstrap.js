(() => {
  'use strict';
  const VERSION='4.28.4.1';
  let requested=false;
  async function start(){
    if(requested||!navigator.geolocation||!window.LuviaPresenceVisitCore)return;
    const auth=window.ParisAuth?.getState?.(); if(!auth?.authenticated)return;
    requested=true;
    try{
      const permission=await navigator.permissions?.query?.({name:'geolocation'}).catch(()=>null);
      if(permission?.state==='denied')return;
      await window.LuviaPresenceVisitCore.setGlobalEnabled(true);
      window.dispatchEvent(new CustomEvent('luvia:global-location-ready',{detail:window.LuviaPresenceVisitCore.diagnostics()}));
    }catch(error){console.info('[LuviaGlobalLocation]',error?.message||error)}
  }
  window.addEventListener('luvia:boot-complete',start);
  window.addEventListener('luvia:trip-changed',()=>setTimeout(start,400));
  window.addEventListener('DOMContentLoaded',()=>{setTimeout(start,1400);window.ParisAuth?.onChange?.(state=>{if(state?.authenticated)setTimeout(start,350)})},{once:true});
  window.LuviaGlobalLocationBootstrap=Object.freeze({version:VERSION,start});
})();
