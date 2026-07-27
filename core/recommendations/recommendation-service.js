(() => {
  'use strict';
  const VERSION='3.6.0';
  const adapters=new Map(), listeners=new Set(), cache=new Map();
  const state={generated:0,shown:0,accepted:0,rejected:0,expired:0,converted:0,invalidations:0,lastRunAt:null,lastError:null,lastContext:null,lastResult:null};
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
  const id=()=>crypto.randomUUID?.()||`rec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const activeTrip=()=>window.LuviaTripContext?.getActiveTrip?.()||window.LuviaTripContext?.getSnapshot?.()||window.LuviaTripStore?.snapshot?.()?.activeTrip||{};
  const tripId=input=>String(input||activeTrip()?.tripId||activeTrip()?.id||'').trim();
  function context(module='places',extra={}){
    const trip=activeTrip(), travel=window.LuviaTravelContext?.snapshot?.()||{}, preferences=window.LuviaTravelPreferences?.context?.(module,{tripId:tripId(extra.tripId),...extra})||{};
    const value={engineVersion:VERSION,module,tripId:tripId(extra.tripId),trip:{id:tripId(extra.tripId),name:trip.tripName||trip.title||'',destination:trip.destination||trip.destinationName||null,startDate:trip.startDate||trip.start_date||null,endDate:trip.endDate||trip.end_date||null},travel,preferences,group:preferences.group||{},generatedAt:new Date().toISOString(),...extra};
    state.lastContext=clone(value);return value;
  }
  function commonScore(candidate,ctx){
    const components=[],reasons=[],warnings=[];let hardFailure=null;
    const add=(key,score,max,label,warning=false)=>{components.push({key,score,max,label});if(label)(warning?warnings:reasons).push(label)};
    if(candidate?.openNow===false&&ctx.intent==='now')hardFailure={key:'closed',label:'Aktuell geschlossen.'};
    const distance=Number(candidate?.distanceMeters);
    if(Number.isFinite(distance)){
      const score=distance<=500?15:distance<=1500?12:distance<=4000?8:distance<=10000?4:0;
      add('distance',score,15,distance<=1500?'Gut von eurem aktuellen Standort erreichbar.':distance>10000?'Liegt deutlich außerhalb eures aktuellen Umfelds.':null,distance>10000);
    }
    if(candidate?.openNow===true)add('opening-hours',10,10,'Ist aktuell geöffnet.');
    const pref=window.LuviaTravelPreferences?.placeSignals?.(candidate,ctx.module)||{signals:[],warnings:[],scoreDelta:0};
    for(const s of pref.signals||[])add(`preference.${s.key}`,Math.max(0,Number(s.weight)||0),10,s.label);
    for(const w of pref.warnings||[])add(`preference.${w.key}`,Math.min(0,Number(w.weight)||0),10,w.label,true);
    const rating=Number(candidate?.rating);if(Number.isFinite(rating)){const score=rating>=4.6?10:rating>=4.3?8:rating>=4?6:rating>=3.5?3:0;add('quality',score,10,rating>=4.3?'Wird von vielen Gästen sehr gut bewertet.':null)}
    return {components,reasons,warnings,hardFailure,baseScore:components.reduce((s,c)=>s+c.score,50)};
  }
  function normalize(raw,candidate,ctx){
    const common=commonScore(candidate,ctx), domain=raw||{};
    const components=[...common.components,...(domain.components||[])];
    const hardFailure=common.hardFailure||domain.hardFailure||null;
    const score=hardFailure?0:clamp(domain.score??components.reduce((s,c)=>s+(Number(c.score)||0),50),0,98);
    return {id:id(),tripId:ctx.tripId,module:ctx.module,entityType:domain.entityType||ctx.module.replace(/s$/,''),entityId:String(domain.entityId||candidate?.id||candidate?.providerPlaceId||''),candidate:clone(candidate),recommendationType:ctx.intent||'for-you',score:Math.round(score),scoreComponents:components,reasons:[...new Set([...(common.reasons||[]),...(domain.reasons||[])])].slice(0,8),warnings:[...new Set([...(common.warnings||[]),...(domain.warnings||[])])].slice(0,6),hardFailure,suggestedDate:domain.suggestedDate||null,suggestedTime:domain.suggestedTime||null,expiresAt:domain.expiresAt||new Date(Date.now()+6*3600000).toISOString(),status:hardFailure?'blocked':'generated',contextSnapshot:clone(ctx),createdAt:new Date().toISOString()};
  }
  function registerAdapter(module,adapter){if(!module||!adapter)throw new Error('RECOMMENDATION_ADAPTER_REQUIRED');adapters.set(String(module),adapter);emit('adapter.registered',{module});return()=>adapters.delete(String(module));}
  async function get(options={}){
    const module=options.module||'places',adapter=adapters.get(module),ctx=context(module,options.context||options), candidates=options.candidates||await adapter?.provideCandidates?.(ctx,options)||[];
    const results=[];
    for(const candidate of candidates){let domain={};try{domain=await adapter?.scoreCandidate?.(candidate,ctx,options)||{};}catch(error){console.warn('[LuviaRecommendations] Adapter score failed',error)}results.push(normalize(domain,candidate,ctx));}
    const filtered=results.filter(r=>options.includeBlocked||!r.hardFailure).sort((a,b)=>b.score-a.score).slice(0,options.limit||20);
    state.generated+=filtered.length;state.lastRunAt=new Date().toISOString();state.lastResult=clone(filtered);cache.set(`${ctx.tripId}:${module}:${ctx.intent||'for-you'}`,clone(filtered));emit('generated',{module,count:filtered.length});
    if(options.persist!==false&&ctx.tripId)await persistBatch(filtered).catch(error=>{state.lastError=error.message});
    return filtered;
  }
  function explain(input){const rec=typeof input==='string'?[...(cache.values())].flat().find(x=>x.id===input):input;return rec?{score:rec.score,reasons:rec.reasons,warnings:rec.warnings,components:rec.scoreComponents,hardFailure:rec.hardFailure}:null;}
  async function decision(recOrId,status,reason=null,action=null){const rec=typeof recOrId==='string'?[...(cache.values())].flat().find(x=>x.id===recOrId):recOrId;if(!rec)throw new Error('RECOMMENDATION_NOT_FOUND');rec.status=status;rec.decisionReason=reason;rec.convertedAction=action;if(state[status]!=null)state[status]++;emit(`decision.${status}`,{recommendation:clone(rec),reason,action});if(rec.tripId)await backend('recommendation.decision',{recommendationId:rec.id,tripId:rec.tripId,status,reason,action,context:context(rec.module,{tripId:rec.tripId})});return rec;}
  const accept=(rec,action='save')=>decision(rec,action==='view'?'opened':action==='save'?'accepted':'converted',null,action);
  const reject=(rec,reason='not_relevant')=>decision(rec,'rejected',reason,null);
  async function alternatives(rec,options={}){const adapter=adapters.get(rec.module);if(adapter?.createAlternatives)return adapter.createAlternatives(rec,context(rec.module,{tripId:rec.tripId}),options);const all=await get({module:rec.module,tripId:rec.tripId,candidates:options.candidates||[],persist:false,limit:options.limit||3});return all.filter(x=>x.entityId!==rec.entityId);}
  async function bestTime(input={}){const adapter=adapters.get(input.module||`${input.entityType||'place'}s`);if(adapter?.bestTime)return adapter.bestTime(input,context(input.module||'places',input));const date=input.date||window.LuviaTravelContext?.snapshot?.().today;return {date,time:input.preferredTime||'18:30',confidence:'medium',reasons:['Passt in das gewählte Zeitfenster.']};}
  async function persistBatch(items){if(!items.length)return null;return backend('recommendation.store',{recommendations:items.map(r=>({id:r.id,tripId:r.tripId,module:r.module,entityType:r.entityType,entityId:r.entityId,recommendationType:r.recommendationType,score:r.score,scoreComponents:r.scoreComponents,reasons:r.reasons,warnings:r.warnings,suggestedDate:r.suggestedDate,suggestedTime:r.suggestedTime,expiresAt:r.expiresAt,status:r.status,contextSnapshot:r.contextSnapshot}))});}
  async function backend(action,payload){if(!window.LuviaBackend?.request)return null;return window.LuviaBackend.request(action,payload);}
  function invalidate(reason='manual',scope={}){state.invalidations++;if(scope.module||scope.tripId){for(const key of [...cache.keys()])if((!scope.module||key.includes(`:${scope.module}:`))&&(!scope.tripId||key.startsWith(scope.tripId+':')))cache.delete(key)}else cache.clear();emit('invalidated',{reason,scope});}
  function emit(name,detail={}){const payload={name,at:new Date().toISOString(),...detail};listeners.forEach(fn=>{try{fn(payload)}catch{}});window.dispatchEvent(new CustomEvent('luvia:recommendations-changed',{detail:payload}));window.LuviaKernelEvents?.emit?.(`recommendations.${name}`,detail);}
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  function diagnostics(){return{version:VERSION,status:'ready',adapters:[...adapters.keys()],cacheKeys:[...cache.keys()],metrics:{...state},context:clone(state.lastContext),lastResult:clone(state.lastResult)}}
  ['luvia:travel-preferences-changed','luvia:travel-context-changed','luvia:trip-changed','luvia:restaurant-lifecycle-changed'].forEach(name=>window.addEventListener(name,e=>invalidate(name,e.detail||{})));
  const api=Object.freeze({version:VERSION,context,registerAdapter,get,explain,accept,reject,alternatives,bestTime,invalidate,subscribe,diagnostics});
  window.LuviaRecommendations=api;
  window.LuviaServiceRegistry?.register?.({name:'recommendations',version:VERSION,description:'Modulübergreifende, erklärbare Smart Recommendation Engine.',dependencies:['backend','places','trips'],status(){return{state:window.LuviaServiceRegistry.states.READY,adapters:adapters.size,generated:state.generated}},diagnostics,test(){const c=context('places');return{ok:Boolean(c&&api.get&&api.explain),message:'Recommendation Contract, Context Collector und Adapter Registry sind verfügbar.',checks:{api:true,context:Boolean(c),adapters:adapters.size>=0}}}},{replace:true});
  emit('service.ready',{version:VERSION});
})();
