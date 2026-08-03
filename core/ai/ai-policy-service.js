(() => {
  'use strict';
  const VERSION='1.0.0';
  const MODES=Object.freeze({READ:'READ',DRAFT:'DRAFT',EXECUTE:'EXECUTE'});
  const BLOCKED_KEYS=/^(email|phone|telephone|password|token|access_token|refresh_token|authorization|apikey|api_key|booking_number|reservation_number|payment|card|iban|address_exact)$/i;
  const MAX_DEPTH=7,MAX_ARRAY=50,MAX_STRING=1200;
  function sanitize(value,depth=0,seen=new WeakSet()){
    if(value==null||typeof value==='boolean'||typeof value==='number')return value;
    if(typeof value==='string')return value.slice(0,MAX_STRING);
    if(depth>=MAX_DEPTH)return'[redacted-depth]';
    if(Array.isArray(value))return value.slice(0,MAX_ARRAY).map(item=>sanitize(item,depth+1,seen));
    if(typeof value==='object'){
      if(seen.has(value))return'[circular]';seen.add(value);
      const result={};
      for(const [key,item] of Object.entries(value)){
        if(BLOCKED_KEYS.test(key))continue;
        result[key]=sanitize(item,depth+1,seen);
      }
      return result;
    }
    return undefined;
  }
  function canRun(capability){const definition=typeof capability==='string'?window.LuviaAICapabilities?.get?.(capability):capability;return Boolean(definition&&Object.values(MODES).includes(definition.mode))}
  function canExecute(proposal,{confirmed=false}={}){return Boolean(confirmed&&proposal&&proposal.status!=='executed'&&['timeline.add','timeline.update','timeline.remove'].includes(proposal.actionType||proposal.action_type))}
  function assertMode(capability,allowed=['READ','DRAFT']){const def=typeof capability==='string'?window.LuviaAICapabilities?.get?.(capability):capability;if(!def||!allowed.includes(def.mode))throw new Error('AI_POLICY_MODE_DENIED');return def}
  function diagnostics(){return{version:VERSION,modes:MODES,execution:'confirmation-required',sanitization:{maxDepth:MAX_DEPTH,maxArray:MAX_ARRAY,maxString:MAX_STRING}}}
  window.LuviaAIPolicy=Object.freeze({version:VERSION,modes:MODES,sanitize,canRun,canExecute,assertMode,diagnostics});
})();
