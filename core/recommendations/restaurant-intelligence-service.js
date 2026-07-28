(() => {
  'use strict';
  const VERSION='4.2.0.3';
  const listeners=new Set();
  const state={loading:false,tripId:null,restaurants:[],primary:null,nearby:null,reservationMissing:null,departure:null,betterAlternative:null,lastUpdatedAt:null,lastError:null};
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const now=()=>new Date();
  const tripId=()=>String(window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||'');
  const meters=v=>Number.isFinite(Number(v))?Number(v):null;
  const formatDistance=v=>{const n=meters(v);if(n==null)return null;return n<1000?`${Math.round(n)} m`:`${(n/1000).toFixed(1).replace('.',',')} km`};
  const minutesFor=(distance,mode='walk')=>{const n=meters(distance);if(n==null)return null;const metersPerMinute=mode==='drive'?700:80;return Math.max(1,Math.ceil(n/metersPerMinute)+(mode==='drive'?4:0))};
  const timeString=d=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const normalizeTime=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value||''))?String(value):null;
  const messageKey=value=>String(value||'').toLowerCase().replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
  function uniqueMessages(values=[],limit=6){
    const result=[];
    for(const raw of values){
      const text=String(raw||'').replace(/^[✓•✨\s]+/,'').trim();
      if(!text)continue;
      const key=messageKey(text);
      const concepts=new Set(key.split(' ').filter(word=>word.length>3));
      const duplicate=result.some(existing=>{
        const other=new Set(messageKey(existing).split(' ').filter(word=>word.length>3));
        const overlap=[...concepts].filter(word=>other.has(word)).length;
        const base=Math.min(concepts.size,other.size)||1;
        return key===messageKey(existing)||overlap/base>=0.6;
      });
      if(!duplicate)result.push(text);
      if(result.length>=limit)break;
    }
    return result;
  }
  function groupInsight(rec,score){
    const participants=Array.isArray(rec?.groupMatch?.participants)?rec.groupMatch.participants:[];
    const known=Number(rec?.contextSnapshot?.group?.memberCount||rec?.contextSnapshot?.group?.participants?.length||participants.length||1);
    const evaluated=participants.length;
    const groupScore=Number.isFinite(Number(rec?.groupMatch?.groupScore))?Number(rec.groupMatch.groupScore):Number(score||0);
    if(evaluated<=1)return {score:groupScore,label:'Persönlicher Match',detail:known>1?`Aktuell ist 1 von ${known} Profilen auswertbar. Weitere Profile verfeinern den Gruppenwert.`:'Basierend auf deinen zentralen Reisepräferenzen.',complete:known<=1,evaluated,known};
    return {score:groupScore,label:'Gruppen-Match',detail:`${evaluated} Profile wurden fair gewichtet. Schwächere Einzelmatches zählen bewusst stärker als ein einfacher Durchschnitt.`,complete:evaluated>=known,evaluated,known};
  }

  function restaurantKind(place){
    const text=[place?.name,place?.primaryType,...(place?.types||[])].join(' ').toLowerCase();
    if(/breakfast|frühstück|bakery|bäckerei|cafe|café|coffee/.test(text))return'cafe';
    if(/ice cream|eis|gelato|dessert|konditorei/.test(text))return'dessert';
    if(/bar|pub|cocktail|wine/.test(text))return'bar';
    return'meal';
  }
  function openingIntervals(place,date=new Date()){
    const periods=place?.openingHours?.periods||place?.raw?.currentOpeningHours?.periods||place?.raw?.regularOpeningHours?.periods||[];
    const day=date.getDay(),out=[];
    for(const period of periods){const open=period?.open,close=period?.close;if(!open||Number(open.day)!==day)continue;const from=Number(open.hour||0)*60+Number(open.minute||0);let to=close?Number(close.hour||0)*60+Number(close.minute||0):1440;if(close&&Number(close.day)!==day)to=1440;out.push([from,to]);}
    return out;
  }
  function bestVisitTime(place,context={}){
    const explicit=normalizeTime(place?.recommendedVisitTime||place?.time||place?.reservationTime);
    if(explicit)return explicit;
    const date=context.date?new Date(`${context.date}T12:00:00`):now();
    const kind=restaurantKind(place);
    const targets=kind==='cafe'?[570,900]:kind==='dessert'?[930,990]:kind==='bar'?[1230,1290]:[750,1110,1230];
    const intervals=openingIntervals(place,date);
    const nowMinutes=date.toDateString()===now().toDateString()?now().getHours()*60+now().getMinutes()+30:0;
    const candidates=targets.filter(x=>x>=nowMinutes).concat(targets);
    let chosen=candidates[0]||1110;
    if(intervals.length){
      const valid=candidates.find(target=>intervals.some(([from,to])=>target>=from&&target<to-30));
      if(valid!=null)chosen=valid;else{const [from,to]=intervals[0];chosen=Math.min(Math.max(from+30,nowMinutes),Math.max(from,to-45));}
    }
    chosen=Math.ceil(chosen/5)*5;
    return `${String(Math.floor(chosen/60)%24).padStart(2,'0')}:${String(chosen%60).padStart(2,'0')}`;
  }
  function reservationHint(place){
    if(place?.reservationStatus==='confirmed'||place?.reservationStatus==='reserved'||place?.lifecycleStatus==='reserved')return 'Reservierung bestätigt';
    if(place?.features?.reservable===true||place?.requiresReservation===true||Number(place?.rating)>=4.5)return 'Reservierung empfohlen';
    return 'Spontaner Besuch möglich';
  }
  function babyFit(place){
    if(place?.features?.childrenAllowed===false)return {ok:false,label:'Nicht für Baby oder Kinder bestätigt'};
    const text=[place?.name,place?.editorialSummary,...(place?.types||[])].join(' ').toLowerCase();
    if(place?.features?.childrenAllowed===true||place?.features?.strollerFriendly===true||/family|famil|casual|café|cafe/.test(text))return {ok:true,label:'Gut mit Baby geeignet'};
    return {ok:null,label:'Baby-Eignung noch nicht bestätigt'};
  }
  function budgetFit(place){
    const budget=window.LuviaTravelPreferences?.context?.('restaurants')?.group?.budget||'balanced';
    const p=String(place?.priceLevel||'');
    const expensive=/EXPENSIVE|VERY_EXPENSIVE|^[34]$/.test(p);
    if(expensive&&/low|spar|günstig/i.test(String(budget)))return {ok:false,label:'Über eurem bevorzugten Budget'};
    return {ok:true,label:'Passt zu eurem Budget'};
  }
  function suggestionLines(place,all=[]){
    const distance=meters(place?.distanceMeters),walk=minutesFor(distance,'walk');
    const best=bestVisitTime(place),departure=walk?new Date(new Date(`${new Date().toISOString().slice(0,10)}T${best}:00`).getTime()-walk*60000):null;
    const items=[];
    if(place?.openNow===false)items.push('Passende geöffnete Alternativen ansehen.');
    else items.push('Für heute einplanen.');
    if(reservationHint(place)==='Reservierung empfohlen'&&place?.reservationStatus!=='confirmed')items.push('Reservierung prüfen.');
    if(departure&&departure>now())items.push(`Abfahrt gegen ${timeString(departure)} Uhr einplanen.`);
    if(place?.openNow!==false&&distance!=null&&distance<=1400)items.push('Lässt sich gut mit eurem aktuellen Standort verbinden.');
    if(all.some(x=>x!==place&&meters(x.distanceMeters)!=null&&meters(x.distanceMeters)<distance))items.push('Nähere Alternative vergleichen.');
    return uniqueMessages(items,4);
  }
  function enrich(place,all=[],context={}){
    const rec=place?.recommendation||{};
    const distance=meters(place?.distanceMeters),walk=Number(place?.route?.walk?.durationMinutes)||minutesFor(distance,'walk'),drive=Number(place?.route?.drive?.durationMinutes)||minutesFor(distance,'drive');
    const baby=babyFit(place),budget=budgetFit(place),best=rec.suggestedTime||bestVisitTime(place,context);
    const reasons=[...(rec.reasons||[])];
    if(distance!=null&&distance<=1500)reasons.push('Sehr gut von eurem aktuellen Standort erreichbar.');
    if(place?.openNow===true)reasons.push('Heute geöffnet und aktuell erreichbar.');
    if(baby.ok===true)reasons.push('Passt zu eurer Reise mit Baby oder Kind.');
    if(budget.ok===true)reasons.push('Das Preisniveau passt zu eurem Budgetstil.');
    const warnings=[...(rec.warnings||[])];
    if(place?.openNow===false)warnings.push('Das Restaurant ist aktuell geschlossen.');
    if(baby.ok===null)warnings.push('Baby- und Kinderwageneignung ist noch nicht bestätigt.');
    if(budget.ok===false)warnings.push(budget.label+'.');
    const alternatives=all.filter(x=>x!==place&&String(x.id||x.providerPlaceId)!==String(place.id||place.providerPlaceId)).map(candidate=>{
      const cd=meters(candidate.distanceMeters),cp=String(candidate.priceLevel||''),pp=String(place.priceLevel||'');
      let reason='Ähnlicher Stil';
      if(cd!=null&&distance!=null&&cd<distance)reason='Diese Alternative ist näher.';
      else if(cp&&pp&&cp<pp)reason='Diese Alternative ist günstiger.';
      else if(babyFit(candidate).ok===true&&baby.ok!==true)reason='Diese Alternative passt besser mit Baby.';
      else if(candidate.openNow===true&&place.openNow===false)reason='Diese Alternative ist aktuell geöffnet.';
      return {...candidate,alternativeReason:reason};
    }).sort((a,b)=>(Number(b.matchScore)||0)-(Number(a.matchScore)||0)).slice(0,3);
    const score=Number(rec.score||place.matchScore||55),group=groupInsight(rec,score);
    const schedule=window.LuviaScheduleIntelligence?.analyze?.({...place,recommendedVisitTime:best},window.LuviaScheduleIntelligence?.snapshot?.().events||[],context)||null;
    const cleanReasons=uniqueMessages(reasons,4);
    const warningKeys=new Set(uniqueMessages(warnings,4).map(messageKey));
    const cleanWarnings=uniqueMessages(warnings,4).filter(w=>!cleanReasons.some(r=>{const a=messageKey(r),b=messageKey(w);return a===b||[...new Set(a.split(' '))].filter(x=>x.length>3&&b.includes(x)).length>=2}));
    return {...place,intelligence:{version:VERSION,score,distanceLabel:formatDistance(distance),openLabel:place.openNow===true?'Heute geöffnet':place.openNow===false?'Heute geschlossen':'Öffnungszeiten prüfen',bestTime:best,bestTimeReason:place?.popularTimes?'Aus aktueller Auslastung abgeleitet':'Aus Öffnungszeiten, Restauranttyp und Tagesplan berechnet',reservationHint:reservationHint(place),babyLabel:baby.label,budgetLabel:budget.label,walkMinutes:walk,driveMinutes:drive,groupMatch:rec.groupMatch||null,groupInsight:group,participantMatches:rec.groupMatch?.participants||[],reasons:cleanReasons,warnings:cleanWarnings,suggestions:uniqueMessages([...(schedule?.guidance||[]),...suggestionLines(place,all)],4),alternatives,schedule}};
  }
  async function enhance(candidates=[],context={}){return candidates.map(p=>enrich(p,candidates,context))}
  function emit(){const snap=snapshot();listeners.forEach(fn=>{try{fn(snap)}catch{}});window.dispatchEvent(new CustomEvent('luvia:restaurant-intelligence-changed',{detail:snap}))}
  async function refresh(options={}){
    const id=String(options.tripId||tripId());if(!id||!window.LuviaRestaurants?.list)return snapshot();if(!options.force&&state.tripId===id&&state.lastUpdatedAt&&Date.now()-new Date(state.lastUpdatedAt).getTime()<30000)return snapshot();if(state.loading)return snapshot();
    state.loading=true;state.tripId=id;emit();
    try{
      const response=await window.LuviaRestaurants.list({tripId:id});
      const entries=(response?.data?.entities||[]).map(window.LuviaRestaurants.entityToEntry);
      const enriched=await enhance(entries,{intent:'dashboard'});
      const active=enriched.filter(x=>!['visited','rated','memory','travel_book'].includes(x.lifecycleStatus));
      const sorted=[...active].sort((a,b)=>(Number(b.intelligence?.score)||0)-(Number(a.intelligence?.score)||0));
      const primary=sorted.find(x=>x.date===new Date().toISOString().slice(0,10))||sorted[0]||null;
      const nearby=[...active].filter(x=>meters(x.distanceMeters)!=null).sort((a,b)=>a.distanceMeters-b.distanceMeters)[0]||null;
      const reservationMissing=active.find(x=>['planned','favorited','saved'].includes(x.lifecycleStatus)&&x.intelligence?.reservationHint==='Reservierung empfohlen')||null;
      let departure=null;
      if(primary?.date&&primary?.time){const visit=new Date(`${primary.date}T${primary.time}:00`),travel=primary.intelligence?.walkMinutes||0,leave=new Date(visit.getTime()-travel*60000),diff=Math.round((leave-now())/60000);if(diff>0&&diff<240)departure={restaurant:primary,minutes:diff,time:timeString(leave)}}
      const betterAlternative=primary?sorted.find(x=>x!==primary&&Number(x.intelligence?.score)>Number(primary.intelligence?.score)+3)||null:null;
      Object.assign(state,{restaurants:enriched,primary,nearby,reservationMissing,departure,betterAlternative,lastUpdatedAt:new Date().toISOString(),lastError:null});
    }catch(error){state.lastError=error?.message||String(error)}finally{state.loading=false;emit()}
    return snapshot();
  }
  function snapshot(){return clone(state)}
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  const api=Object.freeze({version:VERSION,enrich,enhance,refresh,snapshot,subscribe,formatDistance,minutesFor,bestVisitTime,diagnostics:()=>({version:VERSION,...snapshot()})});
  window.LuviaRestaurantIntelligence=api;
  ['luvia:trip-changed','luvia:restaurant-lifecycle-changed','luvia:restaurants-v2-updated','luvia:travel-context-changed','luvia:travel-preferences-changed'].forEach(name=>window.addEventListener(name,()=>refresh().catch(()=>{})));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh().catch(()=>{}),{once:true});else queueMicrotask(()=>refresh().catch(()=>{}));
})();
