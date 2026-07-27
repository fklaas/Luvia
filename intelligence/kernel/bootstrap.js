(function(){
  'use strict';
  const boot=()=>window.LuviaKernel?.start?.().catch(error=>console.error('[Luvia] Kernel bootstrap failed',error));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
