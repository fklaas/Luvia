(() => {
  'use strict';
  const VERSION='4.22.1';
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const pick=(source,keys)=>Object.fromEntries(keys.filter(key=>source?.[key]!=null).map(key=>[key,clone(source[key])]));
  function tripContext(trip={}){
    const destination=trip.destination||{};
    return{
      id:trip.id||trip.tripId||null,
      title:trip.title||trip.tripName||null,
      destination:pick(destination,['name','city','region','country','countryCode','formattedAddress','location','center','timezone','currency','locale']),
      dates:{start:trip.startDate||trip.start_date||null,end:trip.endDate||trip.end_date||null},
      occasion:trip.occasion||trip.tripPurpose||null,
      participantSummary:{count:Number(trip.memberCount||trip.participants?.length||0)||null,hasChildren:Boolean(trip.hasChildren||trip.familyContext?.children),hasBaby:Boolean(trip.hasBaby||trip.familyContext?.baby)},
      enabledModules:clone(trip.modules||trip.selectedModules||[])
    };
  }
  function pruneSchedule(value={}){return{events:(value.events||[]).slice(0,40).map(event=>pick(event,['id','entityType','title','date','time','startAt','endAt','durationMinutes','lifecycleStatus','placeId','providerPlaceId'])),conflicts:clone(value.conflicts||[]),lastUpdatedAt:value.lastUpdatedAt||null}}
  function prunePlaces(value={}){const items=[];for(const [type,bucket] of Object.entries(value.types||{}))for(const record of (bucket?.records||[]).slice(0,15)){const entity=record.entity?.place||record.entity||{};items.push({type,providerPlaceId:record.providerPlaceId||entity.providerPlaceId||null,name:entity.name||entity.displayName||null,status:record.status||null,isFavorite:Boolean(record.isFavorite),rating:entity.rating??null})}return items.slice(0,60)}
  function pruneToday(value={}){return pick(value,['status','current','next','freeWindows','conflicts','departure','generatedAt'])}
  function pruneRecommendations(value={}){return{lastDecision:clone(value.lastDecision||null),recent:(value.lastEvents||[]).slice(0,20).map(event=>pick(event,['module','entityType','entityId','eventType','createdAt'])),settings:pick(value.settings||{},['enabled','minimumScore'])}}
  async function assemble(capability,{currentMoment={},candidatePlaces=[],extraContext={}}={}){
    const definition=window.LuviaAICapabilities?.get?.(capability);
    if(!definition)throw new Error(`AI_CAPABILITY_UNKNOWN:${capability}`);
    const evidence=await window.LuviaAITools.collect(definition.tools,{capability});
    const trip=evidence['trip.current']||{};
    const wantsJourney=(definition.tools||[]).includes('journey.context');
    const graph=evidence['journey.context']||(wantsJourney?await window.LuviaJourneyKnowledgeGraph?.load?.().catch(()=>null):null)||null;
    if(graph?.evidence)window.LuviaAIEvidence?.put?.(graph.evidence,{capability});
    const travel=evidence['travel.context']||{};
    const context={
      schemaVersion:1,
      capability,
      user:{explicitPreferences:evidence['preferences.current']||{},learnedSignals:(evidence['memory.signals']?.signals||[]).filter(signal=>signal.status==='inferred')},
      trip:tripContext(trip),
      live:{now:travel.now||new Date().toISOString(),today:travel.today||new Date().toISOString().slice(0,10),weekday:travel.weekday||null,phase:travel.phase||null,tripDay:travel.tripDay||null,location:travel.location?pick(travel.location,['latitude','longitude','accuracy']):null},
      journey:{knowledgeGraph:graph?{schemaVersion:graph.schemaVersion,events:(graph.events||[]).slice(0,20).map(event=>pick(event,['id','entityType','title','date','time','startAt','placeId','providerPlaceId'])),reservations:(graph.reservations||[]).slice(0,10),places:(graph.places||[]).slice(0,20).map(place=>pick(place,['id','providerPlaceId','name','primaryType','rating'])),participants:(graph.participants||[]).slice(0,8).map(person=>pick(person,['id','name','role'])),summary:graph.summary,generatedAt:graph.generatedAt,cloudAuthoritative:true}:null,schedule:pruneSchedule(evidence['schedule.current']||{}),today:pruneToday(evidence['today.current']||{}),recommendations:pruneRecommendations(evidence['recommendations.current']||{}),savedPlaces:prunePlaces(evidence['places.saved']||{})},
      currentMoment:clone(currentMoment||{}),
      candidates:(candidatePlaces||[]).slice(0,30).map(place=>pick(place,['id','providerPlaceId','name','displayName','primaryType','types','rating','userRatingCount','distanceMeters','formattedAddress','editorialSummary','features','businessStatus'])),
      extra:clone(extraContext||{})
    };
    return window.LuviaAIPolicy.sanitize(context);
  }
  function diagnostics(){return{version:VERSION,principles:['minimum-necessary-context','explicit-preferences-separated-from-learning','no-credentials','no-contact-data']}}
  window.LuviaAIContext=Object.freeze({version:VERSION,assemble,diagnostics});
})();
