(() => {
  'use strict';
  const VERSION='3.0.0';
  const adapters=new Map();
  const listeners=new Set();
  let revision=0;
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const list=value=>Array.isArray(value)?value.map(item=>String(item||'').trim()).filter(Boolean):[];
  const unique=value=>[...new Set(list(value).map(item=>item.toLocaleLowerCase('de-DE')))];
  const profile=()=>window.LuviaProfileService?.snapshot?.().profile||{};
  const normalized=()=>window.LuviaUserPreferences?.get?.()||window.LuviaPreferenceSchema?.normalizePreferences?.(profile())||{};

  function personal(){
    const p=profile(),prefs=normalized();
    return Object.freeze({
      userId:p.userId||null,
      dietary:unique(prefs.dietaryPreferences),
      interests:unique(prefs.travelInterests),
      travelStyles:unique(prefs.travelStyles),
      activityPreferences:unique(prefs.activityPreferences),
      entertainmentPreferences:unique(prefs.entertainmentPreferences),
      diningPreferences:unique(prefs.diningPreferences),
      mobilityPreferences:unique(prefs.mobilityPreferences),
      accessibilityNeeds:unique(prefs.accessibilityNeeds||prefs.accessibilityPreferences?.needs),
      familyPreferences:clone(prefs.familyPreferences||{}),
      atmospherePreferences:unique(prefs.atmospherePreferences),
      pace:prefs.travelPace||'balanced',
      budget:prefs.budgetPreference||'medium',
      preferenceVersion:prefs.preferenceSchemaVersion||3,
      onboardingCompletedAt:prefs.preferencesCompletedAt||null,
      personalizedRecommendations:p.personalizedRecommendations!==false,
      activityData:p.activityData!==false,
      locationSharing:Boolean(p.locationSharing),
      language:p.language||'de',
      timezone:p.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Berlin'
    });
  }

  function snapshot(){
    const own=personal();
    return Object.freeze({version:VERSION,revision,personal:own,group:{dietary:[...own.dietary],interests:[...own.interests],travelStyles:[...own.travelStyles],activityPreferences:[...own.activityPreferences],entertainmentPreferences:[...own.entertainmentPreferences],diningPreferences:[...own.diningPreferences],mobilityPreferences:[...own.mobilityPreferences],accessibilityNeeds:[...own.accessibilityNeeds],familyPreferences:clone(own.familyPreferences),atmospherePreferences:[...own.atmospherePreferences],pace:own.pace,budget:own.budget,participantCount:own.userId?1:0,source:'supabase-user-profiles-v3'}});
  }

  function text(place){return [place?.name,place?.editorialSummary,place?.primaryTypeLabel,...(place?.types||[])].join(' ').toLocaleLowerCase('de-DE');}
  function priceBand(level){const raw=String(level||'');if(/FREE|INEXPENSIVE|^1$/.test(raw))return'low';if(/MODERATE|^2$/.test(raw))return'medium';if(/EXPENSIVE|VERY_EXPENSIVE|^[34]$/.test(raw))return'premium';return null;}
  function placeSignals(place,moduleId='places'){
    const prefs=snapshot().group,t=text(place),signals=[],warnings=[];
    const vegetarian=prefs.dietary.some(value=>/vegetar/.test(value)),vegan=prefs.dietary.some(value=>/vegan/.test(value));
    if(moduleId==='restaurants'||moduleId==='places'){
      const offersVeg=place?.features?.servesVegetarianFood===true||/vegetar|vegan/.test(t);
      if((vegetarian||vegan)&&offersVeg)signals.push({key:'dietary',weight:9,label:vegan?'Vegane oder vegetarische Auswahl passt zu eurem Profil.':'Vegetarische Auswahl passt zu eurem Profil.'});
      if((vegetarian||vegan)&&place?.features?.servesVegetarianFood===false)warnings.push({key:'dietary',weight:-10,label:'Die hinterlegten Ernährungswünsche sind hier möglicherweise nicht erfüllt.'});
    }
    const interests=[...prefs.interests,...prefs.activityPreferences,...prefs.entertainmentPreferences];
    const rules=[[/culture|kultur|history|geschichte|museum|architecture|architektur/,/museum|gallery|art|historic|monument|architecture|kultur|geschichte/,'Passt zu eurem Interesse an Kultur und Geschichte.'],[/photography|fotografie|foto/,/view|rooftop|panoram|scenic|landmark|photo|aussicht/,'Bietet Potenzial für eure Fotografie-Interessen.'],[/culinary|essen|kulinar/,/restaurant|café|bakery|food|dining|bistro/,'Passt zu eurem kulinarischen Interesse.'],[/nature|natur|park|outdoor/,/park|garden|nature|beach|forest/,'Passt zu eurem Interesse an Natur und Erholung.'],[/shopping|mode/,/shopping|store|market|boutique|mall/,'Passt zu eurem Shopping-Interesse.'],[/family|famil/,/playground|zoo|aquarium|amusement|family/,'Passt zu eurer Familienzeit.'],[/live_music|theatre|events|musik|theater|event/,/music|concert|theater|opera|event/,'Passt zu euren Unterhaltungswünschen.']];
    for(const [prefRx,placeRx,label] of rules){if(interests.some(value=>prefRx.test(value))&&placeRx.test(t))signals.push({key:'interest',weight:6,label});}
    const band=priceBand(place?.priceLevel);if(band&&band===prefs.budget)signals.push({key:'budget',weight:4,label:prefs.budget==='low'?'Passt zu eurem preisbewussten Budgetstil.':prefs.budget==='premium'?'Passt zu eurem Premium-Budgetstil.':'Passt zu eurem ausgewogenen Budgetstil.'});
    if(prefs.pace==='relaxed'&&(place?.features?.reservable===true||/park|café|spa|garden|ruhig/.test(t)))signals.push({key:'pace',weight:3,label:'Lässt sich gut in ein entspanntes Reisetempo integrieren.'});
    if(prefs.pace==='active'&&/tour|hike|climb|adventure|sport|walking/.test(t))signals.push({key:'pace',weight:4,label:'Passt zu eurem aktiven Reisetempo.'});
    if(moduleId==='mobility'&&prefs.accessibilityNeeds.length&&/accessible|wheelchair|barrier|stufenlos|rollstuhl/.test(t))signals.push({key:'accessibility',weight:8,label:'Passt zu euren hinterlegten Anforderungen an Barrierefreiheit.'});
    return {signals,warnings,scoreDelta:[...signals,...warnings].reduce((sum,item)=>sum+Number(item.weight||0),0)};
  }

  function context(moduleId='places',extra={}){const base=snapshot(),adapter=adapters.get(moduleId),adapted=adapter?adapter(clone(base),clone(extra)):{};return Object.freeze({...base,moduleId,generatedAt:new Date().toISOString(),...extra,...(adapted||{})});}
  function discoveryContext(domain,extra={}){const shared=window.LuviaUserPreferences?.getDiscoveryContext?.(domain,extra)||{preferences:normalized(),...extra};return context(domain,shared);}
  function buildDiscoveryContract(domain,answers,extra={}){return window.LuviaPreferenceSchema?.buildContract?.(domain,answers,discoveryContext(domain,extra))||null;}
  function reasons(place,moduleId='places',limit=4){return placeSignals(place,moduleId).signals.map(item=>item.label).slice(0,limit);}
  function score(place,moduleId='places'){return placeSignals(place,moduleId).scoreDelta;}
  function registerAdapter(moduleId,adapter){if(!moduleId||typeof adapter!=='function')throw new Error('PREFERENCE_ADAPTER_REQUIRED');adapters.set(String(moduleId),adapter);return()=>adapters.delete(String(moduleId));}
  function emit(reason){revision++;const value=snapshot();listeners.forEach(listener=>{try{listener(value,reason)}catch(error){console.warn('[LuviaPreferences]',error)}});window.dispatchEvent(new CustomEvent('luvia:travel-preferences-changed',{detail:{reason,snapshot:value}}));}
  function subscribe(listener){listeners.add(listener);listener(snapshot(),'subscribe');return()=>listeners.delete(listener);}
  window.addEventListener('luvia:user-preferences-changed',event=>emit(event.detail?.reason||'user-preferences'));
  window.LuviaTravelPreferences=Object.freeze({version:VERSION,snapshot,context,discoveryContext,buildDiscoveryContract,personal,placeSignals,reasons,score,registerAdapter,subscribe});
})();
