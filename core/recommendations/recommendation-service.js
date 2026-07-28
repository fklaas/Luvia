(() => {
  'use strict';
  const VERSION='3.9.1';
  const RULE_VERSION='restaurant-intelligence-1';
  const adapters=new Map(), providers=new Map(), contextSources=new Map(), constraints=new Map(), listeners=new Set(), cache=new Map();
  const DEFAULT_SETTINGS={enabled:true,personalization:true,useLocation:true,learning:true,debug:false,maxDistanceMeters:30000,minimumScore:0};
  let settings={...DEFAULT_SETTINGS}, simulation=null;
  const state={generated:0,shown:0,opened:0,accepted:0,rejected:0,expired:0,converted:0,blocked:0,invalidations:0,lastRunAt:null,lastError:null,lastContext:null,lastResult:null,lastDecision:null,lastEvents:[],lastConstraintReport:null};
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
  const uid=()=>crypto.randomUUID?.()||`rec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const activeTrip=()=>window.LuviaTripContext?.getActiveTrip?.()||window.LuviaTripContext?.getSnapshot?.()||window.LuviaTripStore?.snapshot?.()?.activeTrip||{};
  const tripId=input=>String(input||activeTrip()?.tripId||activeTrip()?.id||'').trim();
  const profile=()=>window.LuviaProfileService?.snapshot?.().profile||{};
  const unique=a=>[...new Set((Array.isArray(a)?a:[]).filter(Boolean))];
  function participantFromProfile(p,source='profile'){
    const travel=p?.travelPreferences||{};
    return {userId:p?.userId||p?.id||null,name:p?.displayName||p?.name||'Reisemitglied',source,dietary:unique(p?.dietaryPreferences||p?.dietary||[]),allergies:unique(p?.allergies||[]),interests:unique(travel.interests||p?.interests||[]),pace:travel.pace||p?.pace||null,budget:travel.budget||p?.budget||null,needs:{baby:Boolean(p?.isBaby||p?.baby),child:Boolean(p?.isChild||p?.child),wheelchair:Boolean(p?.wheelchair),stroller:Boolean(p?.stroller),accessibility:unique(p?.accessibilityNeeds||[])},hardRequirements:clone(p?.hardRequirements||{})};
  }
  function defaultGroup(trip,prefs){
    const own=participantFromProfile(profile());
    const tripMembers=Array.isArray(trip?.members)?trip.members:[];
    const collaboration=window.LuviaCollaboration?.snapshot?.()||{};
    const known=new Map();
    if(own.userId)known.set(String(own.userId),own);
    for(const m of tripMembers){const x=participantFromProfile(m,'trip');known.set(String(x.userId||m.id||uid()),x)}
    for(const m of collaboration.presence||[]){const key=String(m.user_id||m.userId||m.display_name||m.displayName||uid());if(!known.has(key))known.set(key,{userId:m.user_id||m.userId||null,name:m.display_name||m.displayName||'Reisemitglied',source:'collaboration',dietary:[],allergies:[],interests:[],pace:null,budget:null,needs:{},hardRequirements:{}})}
    const participants=[...known.values()];
    if(!participants.length)participants.push(own);
    const dietary=unique(participants.flatMap(x=>x.dietary||prefs?.group?.dietary||[]));
    const allergies=unique(participants.flatMap(x=>x.allergies||[]));
    return {participants,participantCount:participants.length,dietary,allergies,interests:unique(participants.flatMap(x=>x.interests||prefs?.group?.interests||[])),pace:prefs?.group?.pace||own.pace||'balanced',budget:prefs?.group?.budget||own.budget||'medium',hardRequirements:{dietary,allergies,baby:participants.some(x=>x.needs?.baby),child:participants.some(x=>x.needs?.child),stroller:participants.some(x=>x.needs?.stroller),wheelchair:participants.some(x=>x.needs?.wheelchair)}};
  }
  async function collectContext(module='places',extra={}){
    const trip=activeTrip(), travel=window.LuviaTravelContext?.snapshot?.()||{}, preferences=window.LuviaTravelPreferences?.context?.(module,{tripId:tripId(extra.tripId),...extra})||{};
    const group=defaultGroup(trip,preferences);
    const base={engineVersion:VERSION,ruleVersion:RULE_VERSION,module,tripId:tripId(extra.tripId),intent:extra.intent||'for-you',trip:{id:tripId(extra.tripId),name:trip.tripName||trip.title||'',destination:trip.destination||trip.destinationName||null,startDate:trip.startDate||trip.start_date||null,endDate:trip.endDate||trip.end_date||null},travel:{...travel,location:settings.useLocation?travel.location:null},preferences:settings.personalization?preferences:{personal:{},group:{source:'disabled'}},group,settings:clone(settings),generatedAt:new Date().toISOString(),...extra};
    for(const [name,source] of contextSources){try{const addition=await source(clone(base));if(addition&&typeof addition==='object')base[name]=addition}catch(error){if(settings.debug)console.warn('[LuviaRecommendations] Context source failed',name,error)}}
    const value=simulation?{...base,...clone(simulation),simulated:true}:base;
    state.lastContext=clone(value);return value;
  }
  function addComponent(list,key,score,max,label,kind='positive',meta={}){list.push({key,score:Number(score)||0,max:Number(max)||0,label,kind,...meta})}
  function commonScore(candidate,ctx){
    const components=[],reasons=[],warnings=[];
    const distance=Number(candidate?.distanceMeters);
    if(Number.isFinite(distance)){const score=distance<=500?15:distance<=1500?12:distance<=4000?8:distance<=10000?4:0;addComponent(components,'distance',score,15,distance<=1500?'Gut vom aktuellen Standort erreichbar.':distance>10000?'Liegt deutlich außerhalb des aktuellen Umfelds.':null,distance>10000?'warning':'positive',{value:distance});if(distance<=1500)reasons.push('Gut vom aktuellen Standort erreichbar.');if(distance>10000)warnings.push('Liegt deutlich außerhalb des aktuellen Umfelds.')}
    if(candidate?.openNow===true){addComponent(components,'opening-hours',10,10,'Ist aktuell geöffnet.');reasons.push('Ist aktuell geöffnet.')}
    const pref=settings.personalization?window.LuviaTravelPreferences?.placeSignals?.(candidate,ctx.module):null;
    for(const s of pref?.signals||[]){addComponent(components,`preference.${s.key}`,Math.max(0,Number(s.weight)||0),10,s.label);reasons.push(s.label)}
    for(const w of pref?.warnings||[]){addComponent(components,`preference.${w.key}`,Math.min(0,Number(w.weight)||0),10,w.label,'warning');warnings.push(w.label)}
    const rating=Number(candidate?.rating);if(Number.isFinite(rating)){const score=rating>=4.6?10:rating>=4.3?8:rating>=4?6:rating>=3.5?3:0;addComponent(components,'quality',score,10,rating>=4.3?'Wird von vielen Gästen sehr gut bewertet.':null);if(rating>=4.3)reasons.push('Wird von vielen Gästen sehr gut bewertet.')}
    return {components,reasons,warnings,baseScore:components.reduce((s,c)=>s+c.score,50)};
  }
  function genericConstraints(candidate,ctx){
    const failures=[],warnings=[];const group=ctx.group||{},hard=group.hardRequirements||{},distance=Number(candidate?.distanceMeters);
    if(candidate?.excluded===true||candidate?.userExcluded===true)failures.push({key:'explicitly-excluded',label:'Dieser Ort wurde ausdrücklich ausgeschlossen.'});
    if(candidate?.visited===true&&ctx.allowRevisit!==true)failures.push({key:'already-visited',label:'Dieser Ort wurde bereits besucht.'});
    if(candidate?.openNow===false&&['now','nearby-now'].includes(ctx.intent))failures.push({key:'closed-now',label:'Aktuell geschlossen.'});
    if(Number.isFinite(distance)&&distance>Number(ctx.maxDistanceMeters||settings.maxDistanceMeters))failures.push({key:'too-far',label:'Liegt außerhalb des erlaubten Entfernungsradius.',value:distance});
    if(hard.wheelchair&&candidate?.accessibility?.wheelchair===false)failures.push({key:'wheelchair',label:'Die notwendige Rollstuhleignung ist nicht erfüllt.'});
    if(hard.stroller&&candidate?.features?.strollerFriendly===false)failures.push({key:'stroller',label:'Die notwendige Kinderwagen-Eignung ist nicht erfüllt.'});
    if((hard.baby||hard.child)&&candidate?.features?.childrenAllowed===false)failures.push({key:'children',label:'Nicht für die mitreisenden Kinder geeignet.'});
    if(ctx.availableMinutes&&candidate?.estimatedDurationMinutes&&Number(candidate.estimatedDurationMinutes)>Number(ctx.availableMinutes))failures.push({key:'time-window',label:'Die Aktivität passt nicht in das verfügbare Zeitfenster.'});
    if(candidate?.requiresReservation===true&&candidate?.reservationAvailable===false)failures.push({key:'reservation',label:'Eine notwendige Reservierung ist nicht verfügbar.'});
    if(candidate?.arrivalOpen===false)failures.push({key:'closes-before-arrival',label:'Der Ort wäre bei der voraussichtlichen Ankunft bereits geschlossen.'});
    return {failures,warnings};
  }
  async function evaluateConstraints(candidate,ctx,adapter,options){
    const report=genericConstraints(candidate,ctx);
    for(const [name,fn] of constraints){try{const r=await fn(candidate,ctx,options)||{};for(const f of r.failures||[])report.failures.push({...f,source:name});for(const w of r.warnings||[])report.warnings.push({...w,source:name})}catch(error){report.warnings.push({key:`constraint.${name}.failed`,label:`Prüfung ${name} konnte nicht ausgeführt werden.`})}}
    if(adapter?.applyHardConstraints){const r=await adapter.applyHardConstraints(candidate,ctx,options)||{};for(const f of r.failures||[])report.failures.push({...f,source:'adapter'});for(const w of r.warnings||[])report.warnings.push({...w,source:'adapter'})}
    state.lastConstraintReport=clone(report);return report;
  }
  function groupScores(candidate,ctx,domain={}){
    const participants=ctx.group?.participants||[];const rows=participants.map(p=>{let score=50;const reasons=[];const text=[candidate?.name,candidate?.editorialSummary,...(candidate?.types||[])].join(' ').toLowerCase();if((p.dietary||[]).some(x=>/vegetar|vegan/.test(x))&&(candidate?.features?.servesVegetarianFood===true||/vegetar|vegan/.test(text))){score+=25;reasons.push('Ernährungsweise')}if((p.interests||[]).some(x=>text.includes(String(x).toLowerCase())))score+=10;if(p.needs?.baby&&candidate?.features?.childrenAllowed!==false)score+=5;return {userId:p.userId,name:p.name,score:clamp(score,0,98),reasons}});return {participants:rows,groupScore:rows.length?Math.round(Math.min(...rows.map(x=>x.score))*0.6+(rows.reduce((s,x)=>s+x.score,0)/rows.length)*0.4):null,method:'minimum-weighted-fairness'};
  }
  function normalize(raw,candidate,ctx,constraintReport){
    const common=commonScore(candidate,ctx),domain=raw||{},components=[...common.components,...(domain.components||[])];
    const failures=[...(constraintReport?.failures||[]),...(domain.failures||[])],warnings=[...common.warnings,...(constraintReport?.warnings||[]).map(x=>x.label),...(domain.warnings||[])];
    const groupMatch=groupScores(candidate,ctx,domain);if(Number.isFinite(groupMatch.groupScore))addComponent(components,'group-match',Math.round(groupMatch.groupScore/10),10,'Berücksichtigt die gesamte Reisegruppe.');
    const blocked=failures.length>0,rawScore=domain.score??components.reduce((s,c)=>s+(Number(c.score)||0),50),score=blocked?0:clamp(rawScore,0,98);
    return {id:uid(),tripId:ctx.tripId,module:ctx.module,entityType:domain.entityType||ctx.module.replace(/s$/,''),entityId:String(domain.entityId||candidate?.id||candidate?.providerPlaceId||''),candidate:clone(candidate),candidateSource:candidate?._recommendationSource||domain.candidateSource||'provided',recommendationType:ctx.intent||'for-you',score:Math.round(score),scoreComponents:components,reasons:unique([...common.reasons,...(domain.reasons||[])]).slice(0,12),warnings:unique(warnings).slice(0,10),constraints:{passed:!blocked,failures,warnings:constraintReport?.warnings||[]},groupMatch,suggestedDate:domain.suggestedDate||null,suggestedTime:domain.suggestedTime||null,expiresAt:domain.expiresAt||new Date(Date.now()+6*3600000).toISOString(),status:blocked?'blocked':'generated',ruleVersion:RULE_VERSION,contextSnapshot:clone(ctx),createdAt:new Date().toISOString()};
  }
  function registerAdapter(module,adapter){if(!module||!adapter)throw new Error('RECOMMENDATION_ADAPTER_REQUIRED');adapters.set(String(module),adapter);emit('adapter.registered',{module});return()=>adapters.delete(String(module))}
  function registerCandidateProvider(module,provider){if(!module||typeof provider!=='function')throw new Error('CANDIDATE_PROVIDER_REQUIRED');providers.set(String(module),provider);emit('provider.registered',{module});return()=>providers.delete(String(module))}
  function registerContextSource(name,source){contextSources.set(String(name),source);return()=>contextSources.delete(String(name))}
  function registerConstraint(name,fn){constraints.set(String(name),fn);return()=>constraints.delete(String(name))}
  async function get(options={}){
    if(!settings.enabled)return[];
    const module=options.module||'places',adapter=adapters.get(module),ctx=await collectContext(module,{...options.context,...options, candidates:undefined});
    let candidates=options.candidates;
    if(!Array.isArray(candidates)){const provider=providers.get(module)||adapter?.provideCandidates;candidates=provider?await provider(ctx,options):[]}
    candidates=Array.isArray(candidates)?candidates:[];
    const results=[];
    for(const candidate of candidates){let domain={};try{domain=await adapter?.scoreCandidate?.(candidate,ctx,options)||{}}catch(error){state.lastError=error.message;if(settings.debug)console.warn('[LuviaRecommendations] Adapter score failed',error)}const report=await evaluateConstraints(candidate,ctx,adapter,options);results.push(normalize(domain,candidate,ctx,report))}
    const all=results.sort((a,b)=>b.score-a.score),filtered=all.filter(r=>options.includeBlocked||r.status!=='blocked').filter(r=>r.score>=Number(options.minimumScore??settings.minimumScore)).slice(0,options.limit||20);
    state.generated+=filtered.length;state.blocked+=all.filter(x=>x.status==='blocked').length;state.lastRunAt=new Date().toISOString();state.lastResult=clone(all);cache.set(`${ctx.tripId}:${module}:${ctx.intent||'for-you'}`,clone(all));emit('generated',{module,count:filtered.length,blocked:all.length-filtered.length});
    if(options.persist!==false&&ctx.tripId)await persistBatch(all).catch(error=>{state.lastError=error.message});
    return filtered;
  }
  function find(input){if(typeof input!=='string')return input;return[...cache.values()].flat().find(x=>x.id===input)||null}
  function explain(input){const rec=find(input);return rec?{score:rec.score,reasons:rec.reasons,warnings:rec.warnings,components:rec.scoreComponents,constraints:rec.constraints,groupMatch:rec.groupMatch,ruleVersion:rec.ruleVersion}:null}
  async function track(recOrId,eventType,data={}){const rec=find(recOrId);if(!rec)throw new Error('RECOMMENDATION_NOT_FOUND');if(state[eventType]!=null)state[eventType]++;const event={id:uid(),recommendationId:rec.id,tripId:rec.tripId,module:rec.module,entityType:rec.entityType,entityId:rec.entityId,eventType,data,createdAt:new Date().toISOString()};state.lastEvents.unshift(event);state.lastEvents=state.lastEvents.slice(0,100);emit(`event.${eventType}`,event);if(rec.tripId){const session=await window.ParisSupabaseClient?.auth?.getSession?.().catch?.(()=>null);if(session?.data?.session?.access_token)backend('recommendation.event',{event},{timeoutMs:3500}).catch(e=>{state.lastError=e.message});}return event}
  const markShown=rec=>track(rec,'shown');const markOpened=rec=>track(rec,'opened');
  async function decision(recOrId,status,reason=null,action=null){const rec=find(recOrId);if(!rec)throw new Error('RECOMMENDATION_NOT_FOUND');rec.status=status;rec.decisionReason=reason;rec.convertedAction=action;if(state[status]!=null)state[status]++;state.lastDecision={at:new Date().toISOString(),recommendationId:rec.id,status,reason,action};emit(`decision.${status}`,{recommendation:clone(rec),reason,action});await track(rec,status,{reason,action});if(rec.tripId)await backend('recommendation.decision',{recommendationId:rec.id,tripId:rec.tripId,status,reason,action,context:await collectContext(rec.module,{tripId:rec.tripId})});return rec}
  const accept=(rec,action='save')=>decision(rec,action==='view'?'opened':action==='save'?'accepted':'converted',null,action);
  const reject=(rec,reason='not_relevant')=>decision(rec,'rejected',reason,null);
  async function alternatives(recOrId,options={}){const rec=find(recOrId);if(!rec)throw new Error('RECOMMENDATION_NOT_FOUND');const adapter=adapters.get(rec.module);if(adapter?.createAlternatives)return adapter.createAlternatives(rec,await collectContext(rec.module,{tripId:rec.tripId}),options);const all=await get({module:rec.module,tripId:rec.tripId,candidates:options.candidates||[],persist:false,includeBlocked:false,limit:Math.max(4,options.limit||3)});return all.filter(x=>x.entityId!==rec.entityId).slice(0,options.limit||3)}
  async function bestTime(input={}){const module=input.module||`${input.entityType||'place'}s`,adapter=adapters.get(module),ctx=await collectContext(module,input);if(adapter?.bestTime)return adapter.bestTime(input,ctx);const date=input.date||ctx.travel?.today;return{date,time:input.preferredTime||'18:30',confidence:'medium',reasons:['Passt in das gewählte Zeitfenster.'],context:{availableMinutes:ctx.availableMinutes||null}}}
  async function persistBatch(items){if(!items.length)return null;return backend('recommendation.store',{recommendations:items.map(r=>({id:r.id,tripId:r.tripId,module:r.module,entityType:r.entityType,entityId:r.entityId,recommendationType:r.recommendationType,candidateSource:r.candidateSource,score:r.score,scoreComponents:r.scoreComponents,reasons:r.reasons,warnings:r.warnings,constraints:r.constraints,groupMatch:r.groupMatch,suggestedDate:r.suggestedDate,suggestedTime:r.suggestedTime,expiresAt:r.expiresAt,status:r.status,ruleVersion:r.ruleVersion,contextSnapshot:r.contextSnapshot}))})}
  async function backend(action,payload){if(!window.LuviaBackend?.request)return null;return window.LuviaBackend.request(action,payload)}
  function invalidate(reason='manual',scope={}){state.invalidations++;if(scope.module||scope.tripId){for(const key of [...cache.keys()])if((!scope.module||key.includes(`:${scope.module}:`))&&(!scope.tripId||key.startsWith(scope.tripId+':')))cache.delete(key)}else cache.clear();emit('invalidated',{reason,scope})}
  function configure(patch={}){settings={...settings,...patch};localStorage.setItem('luvia.recommendations.settings.v1',JSON.stringify(settings));invalidate('settings.changed');emit('settings.changed',{settings:clone(settings)});return clone(settings)}
  function resetLearning(){state.lastEvents=[];state.lastDecision=null;backend('recommendation.learning.reset',{tripId:tripId()}).catch(()=>{});emit('learning.reset',{});return true}
  function simulate(value){simulation=value?clone(value):null;invalidate('simulation.changed');return simulation}
  function emit(name,detail={}){const payload={name,at:new Date().toISOString(),...detail};listeners.forEach(fn=>{try{fn(payload)}catch{}});window.dispatchEvent(new CustomEvent('luvia:recommendations-changed',{detail:payload}));window.LuviaKernelEvents?.emit?.(`recommendations.${name}`,detail)}
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  function diagnostics(){return{version:VERSION,ruleVersion:RULE_VERSION,status:settings.enabled?'ready':'disabled',settings:clone(settings),adapters:[...adapters.keys()],providers:[...providers.keys()],contextSources:[...contextSources.keys()],constraints:[...constraints.keys()],cacheKeys:[...cache.keys()],metrics:{...state},context:clone(state.lastContext),lastResult:clone(state.lastResult),lastEvents:clone(state.lastEvents),simulation:clone(simulation)}}
  try{settings={...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem('luvia.recommendations.settings.v1')||'{}')}}catch{}
  ['luvia:travel-preferences-changed','luvia:travel-context-changed','luvia:trip-changed','luvia:restaurant-lifecycle-changed','luvia:collaboration-changed'].forEach(name=>window.addEventListener(name,e=>invalidate(name,e.detail||{})));
  const api=Object.freeze({version:VERSION,ruleVersion:RULE_VERSION,context:collectContext,registerAdapter,registerCandidateProvider,registerContextSource,registerConstraint,get,explain,markShown,markOpened,accept,reject,alternatives,bestTime,track,invalidate,configure,settings:()=>clone(settings),resetLearning,simulate,subscribe,diagnostics});
  window.LuviaRecommendations=api;emit('service.ready',{version:VERSION});
})();
