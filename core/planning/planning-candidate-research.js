(() => {
  'use strict';
  const VERSION='4.24.1';
  const inFlight=new Map();
  const clone=v=>JSON.parse(JSON.stringify(v??null));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const providerId=p=>String(p?.providerPlaceId||p?.id||'').replace(/^places\//,'');
  const destinationName=(session,trip)=>session?.context?.destination||trip?.destination?.name||trip?.destination?.formattedAddress||trip?.name||'';
  const text=(...values)=>values.filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  const lc=v=>String(v||'').toLowerCase();
  const labels=list=>(list||[]).map(x=>String(x?.label||x?.value||'')).filter(Boolean);
  const goalText=goal=>text(goal?.label,labels(goal?.hardConstraints).join(' '),labels(goal?.softPreferences).join(' '));
  const types=p=>[p?.primaryType,...(p?.types||[])].filter(Boolean).map(lc);
  const hasType=(p,allowed)=>types(p).some(t=>allowed.includes(t));
  const modeLabel={TRANSIT:'Bus und Bahn',DRIVE:'Auto',WALK:'Zu Fuß',BICYCLE:'Fahrrad'};
  const genericNames=new Set(['x','kino','cinema','restaurant','café','cafe','meppen']);
  const saneName=(name,kind)=>{const value=String(name||'').trim(),low=lc(value);if(value.length<3||genericNames.has(low))return false;if(kind==='cinema'&&!/[a-zäöüß]{3,}/i.test(value))return false;return true};
  async function enrichDetails(place){const id=providerId(place);if(!id)return place;try{const response=await window.LuviaPlaces.details(id,{languageCode:'de',regionCode:'DE'});return {...place,...(response?.data?.place||response?.data||{})}}catch{return place}}
  const transitVehicleType=leg=>lc(leg?.transit?.transitLine?.vehicle?.type||leg?.transit?.transitLine?.vehicle?.name?.text||leg?.transit?.transitLine?.name||'');
  const hasRailLeg=route=>(route?.legs||[]).some(leg=>/(rail|train|zug|regional|intercity|tram|subway)/.test(transitVehicleType(leg)));

  const contracts={
    meal:{allowed:['restaurant','italian_restaurant','vegetarian_restaurant','vegan_restaurant','cafe','meal_takeaway','food'],excluded:['hospital','locality','tourist_information','museum','movie_theater']},
    cinema:{allowed:['movie_theater'],excluded:['museum','tourist_attraction','hospital','locality']},
    activity:{allowed:['tourist_attraction','museum','park','amusement_center','bowling_alley','aquarium','zoo','movie_theater'],excluded:['hospital','locality','tourist_information']}
  };

  function classifyGoal(goal){
    const value=lc(goalText(goal));
    if(goal?.type==='meal'||/(essen|restaurant|nudel|pasta|italien|vegetar|vegan)/.test(value))return 'meal';
    if(/(kino|film|movie|cinema)/.test(value))return 'cinema';
    return 'activity';
  }
  function searchPlans(goal,destination){
    const kind=classifyGoal(goal),value=goalText(goal);
    if(kind==='meal'){
      const pasta=/(nudel|pasta|italien)/i.test(value),veg=/(vegetar|vegan)/i.test(value);
      return [
        {kind,query:text(veg?'vegetarisches Restaurant':'Restaurant',pasta?'Pasta italienisch':'',destination),includedType:pasta?'italian_restaurant':'restaurant'},
        {kind,query:text(pasta?'italienisches Restaurant Pasta':'vegetarisches Restaurant',destination),includedType:'restaurant'},
        {kind,query:text(value,destination),includedType:'restaurant'}
      ];
    }
    if(kind==='cinema') return [
      {kind,query:text('Kino',destination),includedType:'movie_theater'},
      {kind,query:text('Filmtheater Cinema',destination),includedType:'movie_theater'}
    ];
    return [
      {kind,query:text(value,destination),includedType:'tourist_attraction'},
      {kind,query:text('Erlebnis Aktivität',destination),includedType:'tourist_attraction'}
    ];
  }
  function evidence(place,destination,kind,plan){
    const out=[],rating=num(place?.rating),count=num(place?.userRatingCount||place?.ratingCount||place?.user_ratings_total),address=lc(place?.formattedAddress||place?.address),query=lc(plan?.query),allText=lc(text(place?.name,place?.editorialSummary?.text,place?.primaryTypeDisplayName?.text,types(place).join(' ')));
    if(providerId(place))out.push({key:'provider',label:'Realer Provider-Ort',confidence:1});
    if(address)out.push({key:'address',label:'Adresse vorhanden',confidence:.95});
    if(rating!==null)out.push({key:'rating',label:`Bewertung ${rating.toFixed(1)}`,confidence:.9});
    if(count!==null)out.push({key:'reviews',label:`${count} Bewertungen`,confidence:.85});
    if(destination&&address.includes(lc(destination)))out.push({key:'destination',label:`Im Zielgebiet ${destination}`,confidence:1});
    if(kind==='cinema'&&hasType(place,contracts.cinema.allowed))out.push({key:'cinema',label:'Als Kino bestätigt',confidence:1});
    if(kind==='meal'){
      if(place?.servesVegetarianFood===true||/(vegetar|vegan)/.test(allText))out.push({key:'dietary',label:'Vegetarische Auswahl belegt',confidence:1});
      else if(/vegetar/.test(query))out.push({key:'dietary-probable',label:'Aus gezielter vegetarischer Suche',confidence:.58});
      if(/(nudel|pasta|italien)/.test(query)&&/(italian_restaurant|restaurant)/.test(types(place).join(' ')))out.push({key:'pasta-probable',label:'Pasta-/Italienisch-Bezug plausibel',confidence:.65});
    }
    return out;
  }
  function validFor(place,kind){
    const contract=contracts[kind]||contracts.activity,t=types(place);
    if(t.some(x=>contract.excluded.includes(x)))return false;
    return t.some(x=>contract.allowed.includes(x));
  }
  function score(place,ev,kind){
    const rating=num(place?.rating)||0,count=num(place?.userRatingCount||place?.ratingCount||0)||0;
    const dietary=ev.some(e=>e.key==='dietary')?12:ev.some(e=>e.key==='dietary-probable')?4:0;
    const cinema=kind==='cinema'&&ev.some(e=>e.key==='cinema')?15:0;
    return Math.round(Math.min(100,25+ev.length*8+rating*5+Math.min(15,Math.log10(count+1)*5)+dietary+cinema));
  }
  function normalize(place,goal,destination,plan){
    const kind=plan.kind,id=providerId(place);if(!id||!saneName(place?.name,kind)||!validFor(place,kind))return null;if(kind==='cinema'&&!hasType(place,['movie_theater']))return null;
    const ev=evidence(place,destination,kind,plan);if(ev.length<2)return null;
    const uncertainties=[];
    if(place?.openNow==null&&place?.currentOpeningHours?.openNow==null)uncertainties.push('Öffnungsstatus noch nicht bestätigt');
    if(kind==='meal'&&!ev.some(e=>e.key==='dietary'))uncertainties.push('Vegetarische Auswahl muss vor der Übernahme bestätigt werden');
    if(kind==='meal'&&/(nudel|pasta|italien)/i.test(goalText(goal))&&!ev.some(e=>e.key==='pasta-probable'))uncertainties.push('Nudel- oder Pasta-Angebot noch nicht bestätigt');
    return {id,providerPlaceId:id,name:String(place.name),address:String(place.formattedAddress||place.address||''),kind,type:goal.type,goalId:goal.id,image:place._cardPhotoUri||place.photoUri||place.photos?.[0]?.uri||null,rating:num(place.rating),ratingCount:num(place.userRatingCount||place.ratingCount),openNow:place.openNow??place.currentOpeningHours?.openNow??null,location:clone(place.location||null),evidence:ev,uncertainties,score:score(place,ev,kind),raw:clone(place)};
  }
  async function researchGoal(session,goal,destination,onProgress,index,total){
    const plans=searchPlans(goal,destination),all=[];
    for(let i=0;i<plans.length;i++){
      const plan=plans[i];onProgress?.({stage:'provider',message:`${goal.label}: Suchrichtung ${i+1}/${plans.length}`,completed:index,total});
      const response=await window.LuviaPlaceEntities.searchPlaces({tripId:session.tripId,type:plan.kind==='meal'?'restaurant':'attraction',includedType:plan.includedType,query:plan.query,maxResultCount:12,strictDestination:true});
      for(const place of response?.data?.places||[]){const detailed=await enrichDetails(place);const candidate=normalize(detailed,goal,destination,plan);if(candidate)all.push(candidate)}
    }
    const unique=[...new Map(all.sort((a,b)=>b.score-a.score).map(c=>[c.providerPlaceId,c])).values()];
    return {goalId:goal.id,goalLabel:goal.label,kind:classifyGoal(goal),status:unique.length?'ready':'empty',candidates:unique.slice(0,5)};
  }
  async function routeBetween(origin,destination,options={}){
    const response=await window.LuviaPlaces.route(origin,destination,options);return response?.data||response;
  }
  function pairScore(a,b,route){
    const duration=route?.walk?.durationMinutes??route?.drive?.durationMinutes??999;
    return Math.round((a.score+b.score)/2-Math.min(25,duration/3));
  }
  async function composePlacePlans(candidateSets,onProgress){
    const ready=candidateSets.filter(s=>s.candidates?.length);if(!ready.length)return[];
    if(ready.length===1)return ready[0].candidates.slice(0,3).map((c,i)=>({id:`single-${c.id}`,role:i===0?'Luvias beste Idee':i===1?'Starke Alternative':'Andere Richtung',score:c.score,stops:[c],route:null,incompleteGoals:candidateSets.filter(s=>!s.candidates?.length).map(s=>s.goalLabel),summary:`${c.name} passt zum bereits zuverlässig gelösten Teil eures Plans.`}));
    const first=ready[0].candidates.slice(0,3),second=ready[1].candidates.slice(0,3),plans=[];
    for(const a of first){for(const b of second){let route=null;if(a.location&&b.location)try{const raw=await routeBetween(a.location,b.location,{modes:['WALK','DRIVE']});const walk=raw?.routes?.walk?.[0]||raw?.walk?.[0]||raw?.walk||null;const drive=raw?.routes?.drive?.[0]||raw?.drive?.[0]||raw?.drive||null;const best=walk||drive;if(best?.durationMinutes&&best?.distanceMeters)route={verified:true,mode:walk?'WALK':'DRIVE',durationMinutes:best.durationMinutes,distanceMeters:best.distanceMeters,legs:best.legs||[]};}catch{};plans.push({id:`pair-${a.id}-${b.id}`,score:pairScore(a,b,route),stops:[a,b],route,summary:`Erst ${a.name}, anschließend ${b.name}.`})}}
    plans.sort((a,b)=>b.score-a.score);return plans.slice(0,3).map((p,i)=>({...p,role:i===0?'Luvias beste Kombination':i===1?'Entspanntere Variante':'Besondere Alternative'}));
  }
  function parseMoveEndpoints(session,trip){
    const value=String(session.userGoal||'');
    const match=value.match(/von\s+(.+?)\s+(?:nach|zum|zur|ins|in das|in den)\s+(.+?)(?:,| möglichst| mit | ohne |$)/i);
    const origin=match?.[1]?.trim()||'';
    const destination=match?.[2]?.trim()||session.constraints?.hard?.find?.(x=>/ziel/i.test(x.key||x.label))?.value||destinationName(session,trip);
    return {origin,destination};
  }
  async function resolvePoint(session,query,trip){
    const destination=destinationName(session,trip);
    if(/unterkunft|hotel|ferienwohnung/i.test(query)){
      const accommodation=trip?.accommodation||trip?.hotel||trip?.lodging||trip?.tripAccommodation;
      const location=accommodation?.location||((accommodation?.latitude!=null&&accommodation?.longitude!=null)?{latitude:accommodation.latitude,longitude:accommodation.longitude}:null);
      if(location)return {label:accommodation.name||'Gespeicherte Unterkunft',name:accommodation.name||'Gespeicherte Unterkunft',location,address:accommodation.address||accommodation.formattedAddress||'',source:'trip_accommodation'};
      throw Object.assign(new Error('Für diese Reise ist noch keine Unterkunft gespeichert. Bitte nennt einen konkreten Startpunkt oder hinterlegt zuerst eure Unterkunft.'),{code:'MOVE_ACCOMMODATION_REQUIRED'});
    }
    const response=await window.LuviaPlaceEntities.searchPlaces({tripId:session.tripId,type:'attraction',includedType:'',query:text(query,destination),maxResultCount:5,strictDestination:true});
    const place=(response?.data?.places||[]).find(p=>p.location)||null;
    if(!place)throw Object.assign(new Error(`„${query}“ konnte nicht eindeutig als Ort aufgelöst werden.`),{code:'MOVE_ENDPOINT_UNRESOLVED'});
    return {label:query,name:place.name,address:place.formattedAddress||place.address||'',location:place.location,providerPlaceId:providerId(place)};
  }
  function normalizeItinerary(mode,route,origin,destination,index){
    if(!route)return null;const transit=route.transit||{};
    return {id:`route-${mode}-${index}`,kind:'mobility_itinerary',mode,modeLabel:modeLabel[mode]||mode,origin,destination,durationMinutes:route.durationMinutes,distanceMeters:route.distanceMeters,departureTime:route.departureTime||transit.departureTime||null,arrivalTime:route.arrivalTime||transit.arrivalTime||null,walkingMinutes:route.walkingMinutes??transit.walkingMinutes??(mode==='WALK'?route.durationMinutes:null),transfers:route.transfers??transit.transfers??null,legs:route.legs||transit.legs||[],fare:route.fare||transit.fare||null,polyline:route.polyline||null,evidence:[{key:'route',label:'Echte Route berechnet',confidence:1},{key:'provider',label:'Google Routes',confidence:1},...(mode==='TRANSIT'&&route.legs?.length?[{key:'transit-details',label:'ÖPNV-Abschnitte vorhanden',confidence:1}]:[])],uncertainties:[mode==='TRANSIT'&&!route.legs?.length?'Keine detaillierten ÖPNV-Abschnitte verfügbar':null,!route.departureTime?'Abfahrtszeit nicht bestätigt':null].filter(Boolean)};
  }
  async function researchMove(session,trip,onProgress){
    const endpoints=parseMoveEndpoints(session,trip);if(!endpoints.origin)throw Object.assign(new Error('Von wo möchtet ihr starten? Eine Unterkunft wird nur verwendet, wenn sie in der Reise gespeichert ist.'),{code:'MOVE_ORIGIN_REQUIRED'});
    onProgress?.({stage:'resolve',message:'Start und Ziel werden eindeutig aufgelöst',completed:0,total:3});
    const [origin,destination]=await Promise.all([resolvePoint(session,endpoints.origin,trip),resolvePoint(session,endpoints.destination,trip)]);
    const textGoal=lc(session.userGoal),railRequired=/(bahn|zug|regionalexpress|regionalbahn)/i.test(textGoal),transitRequired=railRequired||/(bus|öffentliche|öpnv)/i.test(textGoal);
    const modes=transitRequired?['TRANSIT']:/(fahrrad|rad)/i.test(textGoal)?['BICYCLE']:/(auto|fahren)/i.test(textGoal)?['DRIVE']:/(zu fuß|laufen|gehen)/i.test(textGoal)?['WALK']:['TRANSIT','WALK','DRIVE'];
    onProgress?.({stage:'routes',message:railRequired?'Bahnverbindungen werden geprüft':'Passende Wege werden verglichen',completed:1,total:3});
    const result=await routeBetween(origin.location,destination.location,{modes,computeAlternativeRoutes:true,departureTime:new Date().toISOString(),transitPreferences:{routingPreference:/wenig.*fuß|entspannt/i.test(session.userGoal)?'LESS_WALKING':'UNSPECIFIED',allowedTravelModes:railRequired?['TRAIN']:undefined}});
    const raw=result?.routes||result||{},items=[];let index=0;
    for(const mode of modes){const values=Array.isArray(raw[mode.toLowerCase()])?raw[mode.toLowerCase()]:[raw[mode.toLowerCase()]];for(const route of values){if(railRequired&&!hasRailLeg(route))continue;const item=normalizeItinerary(mode,route,origin,destination,index++);if(item)items.push(item)}}
    const prefersWalk=/wenig.*fuß/i.test(session.userGoal),prefersRelax=/entspannt/i.test(session.userGoal);items.forEach(item=>{let score=100-(item.durationMinutes||60);if(item.mode==='TRANSIT')score+=15;if(railRequired&&hasRailLeg(item))score+=30;if(prefersWalk&&item.walkingMinutes!=null)score-=item.walkingMinutes*2;if(prefersRelax&&item.transfers!=null)score-=item.transfers*12;item.score=Math.max(1,Math.round(score));item.requiredMode=railRequired?'RAIL':transitRequired?'TRANSIT':null;});
    items.sort((a,b)=>b.score-a.score);onProgress?.({stage:'done',message:'Mobilitätsrouten geprüft',completed:3,total:3});return items.slice(0,3).map((item,i)=>({...item,role:i===0?'Luvias Empfehlung':i===1?'Entspanntere Alternative':'Weitere passende Route'}));
  }
  async function researchPlaces(session,trip,onProgress){
    const destination=destinationName(session,trip),goals=(session.goals||[]).slice(0,4),sets=[];
    for(let i=0;i<goals.length;i++)sets.push(await researchGoal(session,goals[i],destination,onProgress,i,goals.length));
    onProgress?.({stage:'compose',message:'Passende Ziele werden zu Planvarianten verbunden',completed:goals.length,total:goals.length+1});
    const plans=await composePlacePlans(sets,onProgress);return {candidateSets:sets,plans};
  }
  async function run(session,trip={},options={}){
    if(!session?.id)throw new Error('Planning Session fehlt.');const key=`${session.id}:${session.updatedAt}:${session.surface}`;if(inFlight.has(key))return inFlight.get(key);
    const task=(async()=>{
      if(session.surface==='move'){
        const candidates=await researchMove(session,trip,options.onProgress);return {version:VERSION,sessionId:session.id,surface:'move',status:candidates.length?'ready':'empty',candidates,plans:candidates,publishedCount:candidates.length,researchedAt:new Date().toISOString(),quality:{domainCorrect:true,provider:'google-routes',maxPublished:3}};
      }
      const result=await researchPlaces(session,trip,options.onProgress);const candidates=result.candidateSets.flatMap(s=>s.candidates);
      return {version:VERSION,sessionId:session.id,surface:'places',status:result.plans.length?'ready':candidates.length?'partial':'empty',candidates,candidateSets:result.candidateSets,plans:result.plans,publishedCount:result.plans.length,researchedAt:new Date().toISOString(),quality:{domainCorrect:true,provider:'canonical-place-core',maxPublished:3}};
    })().finally(()=>inFlight.delete(key));inFlight.set(key,task);return task;
  }
  window.LuviaPlanningResearch=Object.freeze({version:VERSION,run,diagnostics:()=>({version:VERSION,inFlight:inFlight.size,maxPlaces:5,maxMove:3,placesProvider:'canonical-place-core',moveProvider:'google-routes',domainCorrect:true})});
})();
