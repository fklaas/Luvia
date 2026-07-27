(function(){
  'use strict';
  const VERSION='2.5.2-myluvia-app-deployment';
  function createBus(options={}){
    const handlers=new Map();
    const history=[];
    const maxHistory=Number.isFinite(options.maxHistory)?options.maxHistory:300;
    const stats={emitted:0,delivered:0,failedDeliveries:0};
    const isolated=Boolean(options.isolated);
    let sequence=0;
    const now=()=>new Date().toISOString();
    const makeId=prefix=>{try{return crypto.randomUUID();}catch{return `${prefix}-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2)}`;}};
    const normalizeOptions=(value={})=>({once:Boolean(value.once),priority:Number.isFinite(value.priority)?value.priority:0,service:value.service||'',label:value.label||''});
    function on(name,handler,opts={}){if(!name||typeof name!=='string')throw new Error('Eventname erforderlich.');if(typeof handler!=='function')throw new Error('Event-Handler erforderlich.');const sub={id:makeId('sub'),name,handler,...normalizeOptions(opts),createdAt:now(),calls:0,lastCalledAt:null};if(!handlers.has(name))handlers.set(name,new Map());handlers.get(name).set(sub.id,sub);return()=>off(sub.id)}
    function once(name,handler,opts={}){return on(name,handler,{...opts,once:true})}
    function off(nameOrId,handler){if(handler&&handlers.has(nameOrId)){for(const [id,sub] of handlers.get(nameOrId)){if(sub.handler===handler)handlers.get(nameOrId).delete(id)}if(handlers.get(nameOrId).size===0)handlers.delete(nameOrId);return true}for(const [name,map] of handlers){if(map.delete(nameOrId)){if(map.size===0)handlers.delete(name);return true}}return false}
    function listeners(name){return[...(handlers.get(name)?.values()||[])].map(({handler,...safe})=>safe)}
    function collect(name){return[...[...(handlers.get(name)?.values()||[])],...[...(handlers.get('*')?.values()||[])]].sort((a,b)=>b.priority-a.priority||a.createdAt.localeCompare(b.createdAt))}
    async function emit(name,payload={},meta={}){if(!name||typeof name!=='string')throw new Error('Eventname erforderlich.');const started=performance.now();const event=Object.freeze({id:makeId('evt'),name,at:now(),payload,meta:Object.freeze({...meta})});const subscriptions=collect(name),deliveries=[];stats.emitted++;if(!isolated)window.LuviaKernelLogger?.debug('events','Event '+name,{listeners:subscriptions.length,eventId:event.id});for(const sub of subscriptions){const deliveryStart=performance.now();try{const value=await sub.handler(event);sub.calls++;sub.lastCalledAt=now();stats.delivered++;deliveries.push({subscriptionId:sub.id,service:sub.service,label:sub.label,ok:true,durationMs:Math.round((performance.now()-deliveryStart)*100)/100,value})}catch(error){stats.failedDeliveries++;deliveries.push({subscriptionId:sub.id,service:sub.service,label:sub.label,ok:false,durationMs:Math.round((performance.now()-deliveryStart)*100)/100,error:error?.message||String(error)});if(!isolated)window.LuviaKernelLogger?.error('events','Handler fehlgeschlagen',{name,eventId:event.id,subscriptionId:sub.id,error:error?.message||String(error)})}finally{if(sub.once)off(sub.id)}}const record={event,listenerCount:subscriptions.length,successCount:deliveries.filter(x=>x.ok).length,errorCount:deliveries.filter(x=>!x.ok).length,durationMs:Math.round((performance.now()-started)*100)/100,deliveries};history.push(record);if(history.length>maxHistory)history.splice(0,history.length-maxHistory);if(!isolated)window.dispatchEvent(new CustomEvent('luvia:kernel-event',{detail:event}));return record}
    function clear(name){if(name)return handlers.delete(name);handlers.clear();return true}
    function clearHistory(){history.length=0}
    function resetStats(){stats.emitted=0;stats.delivered=0;stats.failedDeliveries=0;return diagnostics()}
    function clearDiagnostics(){clearHistory();resetStats();return diagnostics()}
    function diagnostics(){const subscriptions=[...handlers.entries()].map(([name,map])=>({name,count:map.size,list:[...map.values()].map(({handler,...safe})=>safe)}));return{version:VERSION,status:'ready',isolated,subscriptionCount:subscriptions.reduce((n,x)=>n+x.count,0),subscriptions,historyCount:history.length,lastEvent:history.at(-1)?.event||null,lastDelivery:history.at(-1)||null,stats:{...stats}}}
    return Object.freeze({version:VERSION,on,once,off,emit,listeners,history:(count=50)=>history.slice(-count),clear,clearHistory,resetStats,clearDiagnostics,diagnostics,createIsolated:()=>createBus({isolated:true,maxHistory})})
  }
  window.LuviaKernelEvents=createBus();
})();
