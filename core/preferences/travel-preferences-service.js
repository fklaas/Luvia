(() => {
  'use strict';
  const VERSION='1.0.0';
  const listeners=new Set();
  const adapters=new Map();
  let revision=0;
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const list=value=>Array.isArray(value)?value.map(x=>String(x||'').trim()).filter(Boolean):[];
  const unique=value=>[...new Set(list(value).map(x=>x.toLocaleLowerCase('de-DE')))];
  const profile=()=>window.LuviaProfileService?.snapshot?.().profile||{};
  function personal(){
    const p=profile(),travel=p.travelPreferences||{};
    return Object.freeze({userId:p.userId||null,dietary:unique(p.dietaryPreferences),interests:unique(travel.interests),pace:travel.pace||'balanced',budget:travel.budget||'medium',personalizedRecommendations:p.personalizedRecommendations!==false,activityData:p.activityData!==false,locationSharing:Boolean(p.locationSharing),language:p.language||'de',timezone:p.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Berlin'});
  }
  function snapshot(){const own=personal();return Object.freeze({version:VERSION,revision,personal:own,group:{dietary:[...own.dietary],interests:[...own.interests],pace:own.pace,budget:own.budget,participantCount:own.userId?1:0,source:'profile-foundation'}});}
  function text(place){return [place?.name,place?.editorialSummary,place?.primaryTypeLabel,...(place?.types||[])].join(' ').toLocaleLowerCase('de-DE');}
  function priceBand(level){const raw=String(level||'');if(/FREE|INEXPENSIVE|^1$/.test(raw))return'low';if(/MODERATE|^2$/.test(raw))return'medium';if(/EXPENSIVE|VERY_EXPENSIVE|^[34]$/.test(raw))return'premium';return null;}
  function placeSignals(place,moduleId='places'){
    const prefs=snapshot().group,t=text(place),signals=[],warnings=[];
    const vegetarian=prefs.dietary.some(x=>/vegetar/.test(x)),vegan=prefs.dietary.some(x=>/vegan/.test(x));
    if(moduleId==='restaurants'||moduleId==='places'){
      const offersVeg=place?.features?.servesVegetarianFood===true||/vegetar|vegan/.test(t);
      if((vegetarian||vegan)&&offersVeg)signals.push({key:'dietary',weight:9,label:vegan?'Vegane oder vegetarische Auswahl passt zu eurem Profil.':'Vegetarische Auswahl passt zu eurem Profil.'});
      if((vegetarian||vegan)&&place?.features?.servesVegetarianFood===false)warnings.push({key:'dietary',weight:-10,label:'Die hinterlegten Ernährungswünsche sind hier möglicherweise nicht erfüllt.'});
    }
    const rules=[[/kultur|geschichte|museum|architektur/,/museum|gallery|art|historic|monument|architecture|kultur|geschichte/,'Passt zu eurem Interesse an Kultur und Geschichte.'],[/fotografie|foto/,/view|rooftop|panoram|scenic|landmark|photo|aussicht/,'Bietet Potenzial für eure Fotografie-Interessen.'],[/essen|kulinar|restaurant/,/restaurant|café|bakery|food|dining|bistro/,'Passt zu eurem kulinarischen Interesse.'],[/natur|park/,/park|garden|nature|beach|forest/,'Passt zu eurem Interesse an Natur und Erholung.'],[/shopping|mode/,/shopping|store|market|boutique|mall/,'Passt zu eurem Shopping-Interesse.']];
    for(const [prefRx,placeRx,label] of rules){if(prefs.interests.some(x=>prefRx.test(x))&&placeRx.test(t))signals.push({key:'interest',weight:6,label});}
    const band=priceBand(place?.priceLevel);
    if(band&&band===prefs.budget)signals.push({key:'budget',weight:4,label:prefs.budget==='low'?'Passt zu eurem preisbewussten Budgetstil.':prefs.budget==='premium'?'Passt zu eurem Premium-Budgetstil.':'Passt zu eurem ausgewogenen Budgetstil.'});
    if(prefs.pace==='relaxed'&&(place?.features?.reservable===true||/park|café|spa|garden|ruhig/.test(t)))signals.push({key:'pace',weight:3,label:'Lässt sich gut in ein entspanntes Reisetempo integrieren.'});
    if(prefs.pace==='active'&&/tour|hike|climb|adventure|sport|walking/.test(t))signals.push({key:'pace',weight:4,label:'Passt zu eurem aktiven Reisetempo.'});
    return {signals,warnings,scoreDelta:[...signals,...warnings].reduce((sum,x)=>sum+Number(x.weight||0),0)};
  }
  function context(moduleId='places',extra={}){const base=snapshot(),adapter=adapters.get(moduleId),adapted=adapter?adapter(clone(base),clone(extra)):{};return Object.freeze({...base,moduleId,generatedAt:new Date().toISOString(),...extra,...(adapted||{})});}
  function reasons(place,moduleId='places',limit=4){return placeSignals(place,moduleId).signals.map(x=>x.label).slice(0,limit);}
  function score(place,moduleId='places'){return placeSignals(place,moduleId).scoreDelta;}
  function registerAdapter(moduleId,adapter){if(!moduleId||typeof adapter!=='function')throw new Error('PREFERENCE_ADAPTER_REQUIRED');adapters.set(String(moduleId),adapter);return()=>adapters.delete(String(moduleId));}
  function emit(reason){revision++;const value=snapshot();listeners.forEach(fn=>{try{fn(value,reason)}catch(error){console.warn('[LuviaPreferences]',error)}});window.dispatchEvent(new CustomEvent('luvia:travel-preferences-changed',{detail:{reason,snapshot:value}}));}
  function subscribe(fn){listeners.add(fn);fn(snapshot(),'subscribe');return()=>listeners.delete(fn);}
  window.addEventListener('luvia:profile-changed',event=>emit(event.detail?.reason||'profile'));
  window.LuviaTravelPreferences=Object.freeze({version:VERSION,snapshot,context,personal,placeSignals,reasons,score,registerAdapter,subscribe});
})();
