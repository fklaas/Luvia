(() => {
  'use strict';
  const VERSION='4.23.0';
  const inFlight=new Map();
  const clone=v=>JSON.parse(JSON.stringify(v??null));
  const providerId=p=>String(p?.providerPlaceId||p?.id||p?.name||'').replace(/^places\//,'');
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const destinationName=(session,trip)=>session?.context?.destination||trip?.destination?.name||trip?.destination?.formattedAddress||trip?.name||'';
  const labels=list=>(list||[]).map(x=>String(x?.label||x?.value||'')).filter(Boolean);
  function goalPlan(goal,destination){
    const type=String(goal?.type||'open');
    const hard=labels(goal?.hardConstraints).join(' ');
    if(type==='meal') return {type:'restaurant',includedType:'restaurant',query:`${goal.label||'Restaurant'} ${hard} ${destination}`.trim()};
    if(type==='activity') return {type:'attraction',includedType:'tourist_attraction',query:`${goal.label||'Aktivität'} ${hard} ${destination}`.trim()};
    return {type:'attraction',includedType:'tourist_attraction',query:`${goal?.label||'Besondere Orte'} ${destination}`.trim()};
  }
  function evidence(place,destination){
    const out=[];const rating=num(place?.rating);const count=num(place?.userRatingCount||place?.ratingCount||place?.user_ratings_total);
    if(providerId(place))out.push({key:'provider',label:'Realer Provider-Ort',confidence:1});
    if(place?.formattedAddress||place?.address)out.push({key:'address',label:'Adresse vorhanden',confidence:.95});
    if(rating!==null)out.push({key:'rating',label:`Bewertung ${rating.toFixed(1)}`,confidence:.9});
    if(count!==null)out.push({key:'reviews',label:`${count} Bewertungen`,confidence:.85});
    const address=String(place?.formattedAddress||place?.address||'').toLowerCase();
    if(destination&&address.includes(String(destination).toLowerCase()))out.push({key:'destination',label:`Im Zielgebiet ${destination}`,confidence:1});
    return out;
  }
  function score(place,ev){
    const rating=num(place?.rating)||0,count=num(place?.userRatingCount||place?.ratingCount||0)||0;
    return Math.round(Math.min(100,35+ev.length*10+rating*5+Math.min(15,Math.log10(count+1)*5)));
  }
  function normalize(place,goal,destination){
    const ev=evidence(place,destination);const id=providerId(place);
    if(!id||!place?.name||ev.length<2)return null;
    return {id,providerPlaceId:id,name:String(place.name),address:String(place.formattedAddress||place.address||''),type:goal.type,goalId:goal.id,image:place._cardPhotoUri||place.photoUri||place.photos?.[0]?.uri||null,rating:num(place.rating),ratingCount:num(place.userRatingCount||place.ratingCount),openNow:place.openNow??place.currentOpeningHours?.openNow??null,location:clone(place.location||null),evidence:ev,uncertainties:[place.openNow==null?'Öffnungsstatus noch nicht bestätigt':null,!place.photos?.length?'Kein belastbares Bild verfügbar':null].filter(Boolean),score:score(place,ev),raw:clone(place)};
  }
  async function researchPlaces(session,trip,onProgress){
    const destination=destinationName(session,trip),plans=(session.goals||[]).slice(0,4).map(g=>({goal:g,...goalPlan(g,destination)}));
    const all=[];let completed=0;
    for(const plan of plans){
      onProgress?.({stage:'provider',message:`Prüfe ${plan.goal.label}`,completed,total:plans.length});
      const response=await window.LuviaPlaceEntities.searchPlaces({tripId:session.tripId,type:plan.type,includedType:plan.includedType,query:plan.query,maxResultCount:10,strictDestination:true});
      for(const place of response?.data?.places||[]){const candidate=normalize(place,plan.goal,destination);if(candidate)all.push(candidate)}
      completed++;
    }
    const unique=[...new Map(all.sort((a,b)=>b.score-a.score).map(c=>[c.providerPlaceId,c])).values()];
    return unique.slice(0,5);
  }
  async function researchMove(session,trip,onProgress){
    const destination=destinationName(session,trip);const goal=session.goals?.[0];const phrase=String(goal?.label||session.userGoal||'').replace(/^Fahrt\s+/i,'');
    onProgress?.({stage:'resolve',message:'Löst Ziel und Mobilitätskontext auf',completed:0,total:2});
    const response=await window.LuviaPlaceEntities.searchPlaces({tripId:session.tripId,type:'mobility',includedType:'',query:`${phrase} ${destination}`,maxResultCount:5,strictDestination:true});
    const places=(response?.data?.places||[]).map(p=>normalize(p,goal||{id:'move',type:'route'},destination)).filter(Boolean).slice(0,3);
    const origin=window.LuviaTravelContext?.snapshot?.()?.location;
    if(origin&&window.LuviaPlaces?.route){
      for(const candidate of places){try{const r=await window.LuviaPlaces.route(origin,candidate.location);candidate.route=r?.data||r;candidate.evidence.push({key:'route',label:'Route berechnet',confidence:1});candidate.score=Math.min(100,candidate.score+15)}catch{candidate.uncertainties.push('Route konnte noch nicht berechnet werden')}}
    }else places.forEach(c=>c.uncertainties.push('Startposition noch nicht verfügbar'));
    onProgress?.({stage:'done',message:'Mobilitätskandidaten geprüft',completed:2,total:2});
    return places.sort((a,b)=>b.score-a.score);
  }
  async function run(session,trip={},options={}){
    if(!session?.id)throw new Error('Planning Session fehlt.');
    const key=`${session.id}:${session.updatedAt}:${session.surface}`;
    if(inFlight.has(key))return inFlight.get(key);
    const task=(async()=>{
      const candidates=session.surface==='move'?await researchMove(session,trip,options.onProgress):await researchPlaces(session,trip,options.onProgress);
      return {version:VERSION,sessionId:session.id,surface:session.surface,status:candidates.length?'ready':'empty',candidates,publishedCount:candidates.length,researchedAt:new Date().toISOString(),quality:{contractsRequired:true,evidenceRequired:true,maxPublished:session.surface==='move'?3:5}};
    })().finally(()=>inFlight.delete(key));
    inFlight.set(key,task);return task;
  }
  window.LuviaPlanningResearch=Object.freeze({version:VERSION,run,diagnostics:()=>({version:VERSION,inFlight:inFlight.size,maxPlaces:5,maxMove:3,provider:'canonical-place-core'})});
})();
