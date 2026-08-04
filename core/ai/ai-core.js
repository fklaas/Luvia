(() => {
  'use strict';
  const VERSION='4.18.0';
  const listeners=new Set();
  const cache=new Map();
  let metrics={requests:0,successes:0,fallbacks:0,failures:0,lastRequestAt:null,lastSuccessAt:null,lastError:null};
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const idOf=place=>String(place?.id||place?.providerPlaceId||place?.provider_place_id||'').replace(/^places\//,'');
  const compactPlace=place=>({id:idOf(place),providerPlaceId:idOf(place),name:place?.name||place?.displayName||'',primaryType:place?.primaryType||place?.primary_type||'',types:[...(place?.types||[])].slice(0,15),rating:Number(place?.rating||0)||null,userRatingCount:Number(place?.userRatingCount||0)||0,distanceMeters:place?.distanceMeters??null,formattedAddress:place?.formattedAddress||place?.address||'',editorialSummary:String(place?.editorialSummary||'').slice(0,500),features:clone(place?.features||{}),businessStatus:place?.businessStatus||null,discoveryScore:Number(place?.discoveryScore||0)||0});
  const hash=value=>{const text=JSON.stringify(value);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
  function emit(reason,detail={}){listeners.forEach(fn=>{try{fn({reason,...detail})}catch{}});window.dispatchEvent(new CustomEvent('luvia:ai-changed',{detail:{reason,...detail}}))}
  function fallback(capability,input={},context={}){
    if(capability==='discovery.plan')return{searchPlans:[{query:String(input.contract?.query||input.query||''),includedTypes:[...(input.contract?.includedTypes||[])],weight:1}],preferredSignals:[...(input.contract?.labels?.context||[]),...(input.contract?.labels?.priorities||[])],mustHave:['correct_category','inside_destination'],excludedSignals:[...(input.contract?.excludedTypes||[])],reasoningSummary:'Regelbasierter Luvia-Fallback – die strikten Provider- und Qualitätsregeln bleiben aktiv.',confidence:.55};
    if(capability==='discovery.rank')return{rankings:(input.candidates||[]).map(place=>({entityId:idOf(place),score:Math.max(0,Math.min(100,Number(place.discoveryScore||50))),confidence:.45,reasons:['Erfüllt den strikten Kategorie- und Qualitätsvertrag.'],unknowns:['Semantische KI-Bewertung war nicht verfügbar.']})),summary:'Deterministische Sortierung ohne KI.'};
    if(capability==='dashboard.brief'){const events=context?.journey?.knowledgeGraph?.events||[];const next=events.filter(e=>e.startAt&&new Date(e.startAt)>=new Date()).slice(0,3);return{headline:next.length?'Euer nächster Reisemoment ist vorbereitet.':'Eure Reise nimmt weiter Form an.',message:next.length?`Als Nächstes: ${next[0].title}${next[0].time?` um ${next[0].time}`:''}. Luvia hat ${events.length} geplante Einträge im Cloud-Reisekontext gefunden.`:'Luvia verbindet eure Planung, den aktuellen Tag und eure Vorlieben. Die persönliche KI-Zusammenfassung ist gerade nicht erreichbar.',highlights:next.map(e=>`${e.date||''} ${e.time||''} · ${e.title}`.trim()),suggestedActions:[{id:'refresh',label:'Neu denken',capability:'dashboard.brief',kind:'refresh'}]};}
    if(capability==='timeline.propose')return{title:'Euer Tagesplan bleibt unverändert',explanation:'Ohne sichere KI-Auswertung nimmt Luvia keine Änderung vor.',changes:[],warnings:['Bitte prüft die Planung manuell.'],confidence:0};
    if(capability==='memory.extract')return{signals:[]};
    if(capability==='text.summarize')return{summary:String(input.text||'').slice(0,400)};
    return{answer:'Luvia kann diese Frage gerade nicht zuverlässig mit KI beantworten. Eure gespeicherten Reisedaten bleiben unverändert.',suggestedActions:[]};
  }
  async function run(capability,input={},options={}){
    const definition=window.LuviaAICapabilities?.get?.(capability);if(!definition)throw new Error(`AI_CAPABILITY_UNKNOWN:${capability}`);
    window.LuviaAIPolicy.assertMode(definition,['READ','DRAFT']);
    const context=await window.LuviaAIContext.assemble(capability,{currentMoment:input.currentMoment||input, candidatePlaces:input.candidates||[],extraContext:input.extraContext||{}});
    const key=`${capability}:${hash({input,context})}`;const cached=cache.get(key);
    if(cached&&cached.expiresAt>Date.now())return clone(cached.value);
    const tier=window.LuviaAIModelRouter.resolve(definition,options);
    metrics={...metrics,requests:metrics.requests+1,lastRequestAt:new Date().toISOString(),lastError:null};emit('request-started',{capability,tier:tier.id});
    try{
      const response=await window.LuviaOpenAIProvider.run({capability,tier:tier.id,input:window.LuviaAIPolicy.sanitize(input),context,schema:definition.schema},{timeoutMs:definition.timeoutMs});
      const data=window.LuviaAIOutputValidator.validate(definition.schema,response?.data?.result||response?.data||{});
      const value={ok:true,data,meta:{...(response?.meta||{}),capability,tier:tier.id,alias:tier.alias,fallback:false}};
      metrics={...metrics,successes:metrics.successes+1,lastSuccessAt:new Date().toISOString()};
      if(definition.cacheTtlMs)cache.set(key,{value:clone(value),expiresAt:Date.now()+definition.cacheTtlMs});emit('request-succeeded',{capability,meta:value.meta});return value;
    }catch(error){
      metrics={...metrics,failures:metrics.failures+1,lastError:{code:error?.code||'AI_REQUEST_FAILED',message:error?.message||String(error),at:new Date().toISOString()}};
      if(options.fallback===false)throw error;
      const data=window.LuviaAIOutputValidator.validate(definition.schema,fallback(capability,input,context));
      const value={ok:true,data,meta:{capability,tier:tier.id,alias:tier.alias,fallback:true,errorCode:error?.code||'AI_UNAVAILABLE'}};
      metrics={...metrics,fallbacks:metrics.fallbacks+1};emit('fallback-used',{capability,error:metrics.lastError});return value;
    }
  }
  async function planDiscovery(domain,result={}){
    const deterministic=clone(result.contract||{});
    const response=await run('discovery.plan',{domain,answers:result.answers||{},contract:deterministic,currentMoment:{domain,answers:result.answers||{}}});
    const plan=response.data||{};
    return{
      ...deterministic,
      ai:{provider:'openai',capability:'discovery.plan',tier:response.meta?.tier,alias:response.meta?.alias,confidence:plan.confidence,fallback:Boolean(response.meta?.fallback),reasoningSummary:plan.reasoningSummary},
      aiSearchPlans:plan.searchPlans||[],
      aiPreferredSignals:plan.preferredSignals||[],
      aiMustHave:plan.mustHave||[],
      aiExcludedSignals:plan.excludedSignals||[],
      preferenceLayers:{...(deterministic.preferenceLayers||{}),globalProfile:'context-only',moduleMoment:'explicit-current-search',mutatesGlobalProfile:false},
      mergePolicy:'global-profile-context-plus-explicit-module-moment',
      mutatesGlobalProfile:false
    };
  }
  async function rankCandidates({domain,contract,candidates=[]}={}){
    if(!candidates.length)return[];
    const compactCandidates=candidates.slice(0,30).map(compactPlace);const response=await run('discovery.rank',{domain,contract,candidates:compactCandidates,currentMoment:{domain,labels:contract?.labels||{},preferredSignals:contract?.aiPreferredSignals||[]}});
    const byId=new Map((response.data?.rankings||[]).map(item=>[String(item.entityId),item]));
    return candidates.map(place=>{
      const ranking=byId.get(idOf(place));if(!ranking)return place;
      const deterministic=Math.max(0,Math.min(100,Number(place.discoveryScore||50)));
      const combined=Math.round((Number(ranking.score||0)*.75+deterministic*.25)*10)/10;
      return{...place,aiMatchScore:combined,matchScore:combined,aiConfidence:ranking.confidence,aiReasons:ranking.reasons||[],aiUnknowns:ranking.unknowns||[],aiRankingFallback:Boolean(response.meta?.fallback),aiCapability:'discovery.rank'};
    }).sort((a,b)=>Number(b.aiMatchScore??b.discoveryScore??0)-Number(a.aiMatchScore??a.discoveryScore??0)||Number(a.distanceMeters??Infinity)-Number(b.distanceMeters??Infinity));
  }
  async function orchestrate(capability,input={},options={}){return window.LuviaAIOrchestrator.run(capability,input,options)}
  async function ask(message,options={}){return run('brain.ask',{message,currentMoment:options.currentMoment||{}},options)}
  async function recommend(input,options={}){return run(options.capability||'discovery.rank',input,options)}
  async function rank(input,options={}){return run('discovery.rank',input,options)}
  async function explain(input,options={}){return run('brain.ask',{...input,instruction:'Erkläre die Empfehlung knapp und ausschließlich anhand der gelieferten Belege.'},options)}
  async function summarize(text,options={}){return run('text.summarize',{text},options)}
  async function proposeAction(input,options={}){const response=await run('timeline.propose',input,options);const data=response.data||{};return window.LuviaAIProposals.present({capability:'timeline.propose',actionType:'timeline.batch',actionPayload:data,explanation:data.explanation})}
  async function learnFromEvent(event){return window.LuviaAIMemory.learnFromEvent(event)}
  async function health(){return window.LuviaOpenAIProvider.health()}
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  function diagnostics(){return{version:VERSION,status:'ready',provider:'openai-via-supabase-edge',serverAuthoritativeModels:true,metrics:clone(metrics),cacheEntries:cache.size,capabilities:window.LuviaAICapabilities?.diagnostics?.(),tools:window.LuviaAITools?.diagnostics?.(),policy:window.LuviaAIPolicy?.diagnostics?.(),context:window.LuviaAIContext?.diagnostics?.(),memory:window.LuviaAIMemory?.diagnostics?.(),orchestrator:window.LuviaAIOrchestrator?.diagnostics?.(),domains:window.LuviaAIDomains?.diagnostics?.(),evidence:window.LuviaAIEvidence?.diagnostics?.(),journey:window.LuviaJourneyKnowledgeGraph?.diagnostics?.(),proposals:window.LuviaAIProposals?.diagnostics?.()}}
  window.LuviaAI=Object.freeze({version:VERSION,run,orchestrate,ask,plan:run,recommend,rank,explain,summarize,proposeAction,learnFromEvent,planDiscovery,rankCandidates,health,subscribe,diagnostics});
  window.dispatchEvent(new CustomEvent('luvia:ai-ready',{detail:{version:VERSION}}));
})();
