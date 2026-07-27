(function(){
  'use strict';
  const state={phase:'created',startedAt:null,readyAt:null,lastError:null};
  const requiredComponents=['environment','data','auth','trips'];
  function registerBuiltIns(){
    const r=window.LuviaKernelRegistry;
    if(!r)throw new Error('Kernel Registry fehlt.');
    const safe=(name,value,kind,version)=>{if(value&&!r.has(name))r.register(name,value,{kind,version})};
    safe('environment',window.LuviaEnvironment,'foundation',window.LuviaEnvironment?.version);
    safe('data',window.LuviaData,'service',window.LuviaData?.version);
    safe('auth',window.ParisAuth,'service','3.3.0-central-supabase-client');
    safe('trips',window.LuviaTripContext,'service','3.3.0-canonical-trip-store');
    safe('destination-context',window.LuviaDestinationContext,'service',window.LuviaDestinationContext?.version||'legacy-adapter');
    safe('database-foundation',window.LuviaDatabaseFoundation,'diagnostic',window.LuviaDatabaseFoundation?.version||'2.1');
    safe('service-registry',window.LuviaServiceRegistry,'kernel',window.LuviaServiceRegistry?.version);
  }
  async function start(){
    if(state.phase==='ready')return snapshot();if(state.phase==='starting')return waitUntilReady();
    state.phase='starting';state.startedAt=new Date().toISOString();window.LuviaKernelLogger?.info('kernel','Kernel startet',window.LuviaKernelVersion);
    try{
      registerBuiltIns();
      const missing=requiredComponents.filter(x=>!window.LuviaKernelRegistry.has(x));
      if(missing.length)window.LuviaKernelLogger?.warn('kernel','Komponenten fehlen',{missing});
      if(!window.LuviaServiceRegistry)throw new Error('Service Registry fehlt.');
      const services=await window.LuviaServiceRegistry.startAll({kernel:api});
      const failed=services.filter(x=>x.state==='failed');
      if(failed.length)window.LuviaKernelLogger?.warn('kernel','Einige Services konnten nicht starten',{failed:failed.map(x=>x.name)});
      state.phase=failed.length?'warning':'ready';state.readyAt=new Date().toISOString();
      await window.LuviaKernelEvents?.emit('kernel.ready',snapshot());
      window.dispatchEvent(new CustomEvent('luvia:kernel-ready',{detail:snapshot()}));return snapshot();
    }catch(error){state.phase='error';state.lastError=error?.message||String(error);window.LuviaKernelLogger?.error('kernel','Kernel konnte nicht starten',{error:state.lastError});throw error}
  }
  function waitUntilReady(timeout=7000){return new Promise((resolve,reject)=>{if(['ready','warning'].includes(state.phase))return resolve(snapshot());const timer=setTimeout(()=>reject(new Error('Kernel-Start hat zu lange gedauert.')),timeout);window.addEventListener('luvia:kernel-ready',()=>{clearTimeout(timer);resolve(snapshot())},{once:true})})}
  function status(){return{phase:state.phase,ready:['ready','warning'].includes(state.phase),healthy:state.phase==='ready',startedAt:state.startedAt,readyAt:state.readyAt,lastError:state.lastError}}
  function snapshot(){return{version:window.LuviaKernelVersion,status:status(),registry:window.LuviaKernelRegistry?.diagnostics(),services:window.LuviaServiceRegistry?.list()||[],events:window.LuviaKernelEvents?.diagnostics(),logger:window.LuviaKernelLogger?.diagnostics(),environment:window.LuviaEnvironment?.snapshot?.()||null}}
  async function diagnostics(){const s=snapshot(),serviceDiagnostics=await window.LuviaServiceRegistry?.diagnostics();return{...s,serviceDiagnostics,healthy:s.status.healthy&&s.registry?.status==='ready'&&s.events?.status==='ready'&&s.logger?.status==='ready'&&serviceDiagnostics?.failed===0}}
  const api={version:window.LuviaKernelVersion,start,waitUntilReady,status,snapshot,diagnostics,registry:window.LuviaKernelRegistry,services:window.LuviaServiceRegistry,events:window.LuviaKernelEvents,logger:window.LuviaKernelLogger};
  window.LuviaKernel=Object.freeze(api);
})();
