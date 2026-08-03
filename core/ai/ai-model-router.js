(() => {
  'use strict';
  const VERSION='1.0.0';
  const TIERS=Object.freeze({
    fast:Object.freeze({id:'fast',alias:'Luna',purpose:'schnelle Klassifikation und Kurzaufgaben'}),
    default:Object.freeze({id:'default',alias:'Terra',purpose:'reguläres Luvia-Denken'}),
    deep:Object.freeze({id:'deep',alias:'Sol',purpose:'komplexe Reiseoptimierung und tiefes Planen'})
  });
  function resolve(capability,options={}){
    const definition=typeof capability==='string'?window.LuviaAICapabilities?.get?.(capability):capability;
    const requested=String(options.tier||definition?.tier||'default');
    return TIERS[requested]||TIERS.default;
  }
  function diagnostics(){return{version:VERSION,provider:'openai',routing:'server-authoritative',tiers:TIERS}}
  window.LuviaAIModelRouter=Object.freeze({version:VERSION,tiers:TIERS,resolve,diagnostics});
})();
