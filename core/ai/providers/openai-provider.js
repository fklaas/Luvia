(() => {
  'use strict';
  const VERSION='1.0.0';
  async function invoke(action,payload={},options={}){
    const client=await window.LuviaSupabaseService.start();
    const timeoutMs=Math.max(3000,Number(options.timeoutMs||30000));
    let timer=null;
    try{
      const request=client.functions.invoke('luvia-intelligence',{body:{action,payload,client:{appVersion:'13.20.1',coreVersion:'4.20.1'}}});
      const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('Luvia Intelligence hat das Zeitlimit überschritten.'),{code:'AI_TIMEOUT'})),timeoutMs)});
      const {data,error}=await Promise.race([request,timeout]);
      if(error)throw Object.assign(new Error(error.message||'Luvia Intelligence ist nicht erreichbar.'),{code:'AI_EDGE_ERROR',cause:error});
      if(data?.ok===false)throw Object.assign(new Error(data.error?.message||'Luvia Intelligence konnte die Aufgabe nicht lösen.'),{code:data.error?.code||'AI_RESPONSE_ERROR',meta:data.meta});
      return data;
    }finally{if(timer)clearTimeout(timer)}
  }
  const run=(payload,options)=>invoke('brain.run',payload,options);
  const health=()=>invoke('brain.health',{}, {timeoutMs:10000});
  window.LuviaOpenAIProvider=Object.freeze({version:VERSION,provider:'openai',invoke,run,health});
})();
