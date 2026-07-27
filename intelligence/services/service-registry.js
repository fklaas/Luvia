(function(){
  'use strict';
  const VERSION='3.1.0.3-service-runtime';
  const STATES=Object.freeze({REGISTERED:'registered',INITIALIZING:'initializing',READY:'ready',WARNING:'warning',OFFLINE:'offline',FAILED:'failed',DISABLED:'disabled',STOPPED:'stopped',DESTROYED:'destroyed'});
  const records=new Map();
  const now=()=>new Date().toISOString();
  const duration=start=>start?Math.max(0,Date.now()-new Date(start).getTime()):0;

  function validate(def){
    if(!def||typeof def!=='object')throw new Error('Service-Definition fehlt.');
    if(!def.name||typeof def.name!=='string')throw new Error('Service-Name fehlt.');
    ['init','start','stop','destroy','status','diagnostics','test'].forEach(key=>{if(def[key]!==undefined&&typeof def[key]!=='function')throw new Error(`${def.name}.${key} muss eine Funktion sein.`);});
  }
  function register(def,options={}){
    validate(def);const name=def.name;
    if(records.has(name)&&options.replace!==true)throw new Error('Service bereits registriert: '+name);
    const record={name,version:def.version||'1.0.0',description:def.description||'',dependencies:[...(def.dependencies||[])],optionalDependencies:[...(def.optionalDependencies||[])],service:def,state:STATES.REGISTERED,registeredAt:now(),initializedAt:null,startedAt:null,stoppedAt:null,destroyedAt:null,lastError:null,lastWarning:null,metrics:{initMs:null,startMs:null,testRuns:0,lastTestAt:null,lastTestMs:null}};
    records.set(name,record);
    window.LuviaKernelLogger?.info('services','Service registriert',{name,version:record.version,dependencies:record.dependencies});
    window.LuviaKernelEvents?.emit('service.registered',{name,version:record.version,dependencies:record.dependencies});
    return def;
  }
  function get(name){return records.get(name)?.service||null;}
  function record(name){return records.get(name)||null;}
  function has(name){return records.has(name);}
  function publicRecord(r){if(!r)return null;return{name:r.name,version:r.version,description:r.description,dependencies:[...r.dependencies],optionalDependencies:[...r.optionalDependencies],state:r.state,registeredAt:r.registeredAt,initializedAt:r.initializedAt,startedAt:r.startedAt,stoppedAt:r.stoppedAt,destroyedAt:r.destroyedAt,lastError:r.lastError,lastWarning:r.lastWarning,uptimeMs:r.startedAt&&r.state===STATES.READY?duration(r.startedAt):0,metrics:{...r.metrics}};}
  function list(){return[...records.values()].map(publicRecord);}
  function setState(r,state,extra={}){r.state=state;if(extra.error)r.lastError=extra.error;if(extra.warning)r.lastWarning=extra.warning;window.LuviaKernelEvents?.emit('service.state.changed',{name:r.name,state,error:r.lastError,warning:r.lastWarning});}
  function order(names=[...records.keys()]){
    const visiting=new Set(),visited=new Set(),result=[];
    function visit(name){if(visited.has(name))return;if(visiting.has(name))throw new Error('Zyklische Service-Abhängigkeit bei '+name);const r=records.get(name);if(!r)throw new Error('Unbekannter Service: '+name);visiting.add(name);r.dependencies.forEach(dep=>{if(!records.has(dep))throw new Error(`${name} benötigt fehlenden Service ${dep}`);visit(dep);});visiting.delete(name);visited.add(name);result.push(name);}
    names.forEach(visit);return result;
  }
  async function initOne(name,context={}){
    const r=records.get(name);if(!r)throw new Error('Service nicht registriert: '+name);if([STATES.READY,STATES.INITIALIZING].includes(r.state))return publicRecord(r);
    for(const dep of r.dependencies)await initOne(dep,context);
    setState(r,STATES.INITIALIZING);const started=performance.now();
    try{await r.service.init?.({...context,registry:api,service:r.service});r.initializedAt=now();r.metrics.initMs=Math.round((performance.now()-started)*100)/100;await r.service.start?.({...context,registry:api,service:r.service});r.startedAt=now();r.metrics.startMs=Math.round((performance.now()-started-r.metrics.initMs)*100)/100;const reported=await r.service.status?.();const target=reported?.state&&Object.values(STATES).includes(reported.state)?reported.state:STATES.READY;setState(r,target);window.LuviaKernelLogger?.info('services','Service bereit',{name,state:r.state});return publicRecord(r);}catch(error){setState(r,STATES.FAILED,{error:error?.message||String(error)});window.LuviaKernelLogger?.error('services','Service-Start fehlgeschlagen',{name,error:r.lastError});throw error;}
  }
  async function startAll(context={}){const names=order();const results=[];for(const name of names){try{results.push(await initOne(name,context));}catch(error){results.push(publicRecord(records.get(name)));}}return results;}
  async function stop(name,context={}){const r=records.get(name);if(!r)return false;try{await r.service.stop?.({...context,registry:api});r.stoppedAt=now();setState(r,STATES.STOPPED);return true;}catch(error){setState(r,STATES.FAILED,{error:error.message});return false;}}
  async function destroy(name,context={}){const r=records.get(name);if(!r)return false;await stop(name,context);try{await r.service.destroy?.({...context,registry:api});r.destroyedAt=now();setState(r,STATES.DESTROYED);return true;}catch(error){setState(r,STATES.FAILED,{error:error.message});return false;}}
  async function runTest(name,context={}){const r=records.get(name);if(!r)throw new Error('Service nicht registriert: '+name);const started=performance.now();r.metrics.testRuns++;r.metrics.lastTestAt=now();try{const result=await r.service.test?.({...context,registry:api})||{ok:true,message:'Kein eigener Test erforderlich.'};r.metrics.lastTestMs=Math.round((performance.now()-started)*100)/100;window.LuviaKernelEvents?.emit('service.test.completed',{name,ok:result.ok!==false,durationMs:r.metrics.lastTestMs});return{service:name,ok:result.ok!==false,durationMs:r.metrics.lastTestMs,...result};}catch(error){r.metrics.lastTestMs=Math.round((performance.now()-started)*100)/100;window.LuviaKernelEvents?.emit('service.test.failed',{name,error:error.message});return{service:name,ok:false,durationMs:r.metrics.lastTestMs,message:error.message,error:error.stack||error.message};}}
  async function diagnostics(name){if(name){const r=records.get(name);if(!r)return null;let detail={};try{detail=await r.service.diagnostics?.()||{};}catch(error){detail={error:error.message};}return{...publicRecord(r),detail};}const services=[];for(const r of records.values())services.push(await diagnostics(r.name));return{version:VERSION,status:'ready',count:services.length,ready:services.filter(x=>x.state===STATES.READY).length,failed:services.filter(x=>x.state===STATES.FAILED).length,startOrder:order(),services};}
  const api=Object.freeze({version:VERSION,states:STATES,register,get,record,has,list,order,init:initOne,startAll,stop,destroy,runTest,diagnostics});
  window.LuviaServiceRegistry=api;
})();
