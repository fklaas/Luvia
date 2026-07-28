(function(){
  'use strict';
  const boot=async()=>{
    try{
      if(window.LUVIA_DIAGNOSTICS_MODE===true){
        // Diagnostic pages must boot without auth refreshes, gateway calls or realtime work.
        window.LuviaSupabaseService?.create?.();
      }else if(window.LuviaSupabaseService?.start){
        await window.LuviaSupabaseService.start();
      }
      await window.LuviaKernel?.start?.({diagnosticsMode:window.LUVIA_DIAGNOSTICS_MODE===true});
    }catch(error){console.error('[Luvia] Kernel bootstrap failed',error);}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
