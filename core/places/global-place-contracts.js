(() => {
'use strict';
const VERSION='4.49.1';
const UI_CATEGORIES=Object.freeze({
food:{key:'food',label:'Essen & Trinken',domainTypes:['restaurant'],includedTypes:['restaurant','cafe','bakery','bar','meal_takeaway','vegetarian_restaurant','vegan_restaurant'],excludedTypes:['hospital','movie_theater','locality'],synonyms:['Restaurant','Café','Bistro','Essen']},
activities:{key:'activities',label:'Aktivitäten',domainTypes:['activity','attraction','family'],includedTypes:['amusement_park','aquarium','bowling_alley','escape_room','gym','spa','stadium','swimming_pool','water_park','zoo','tourist_attraction'],excludedTypes:['hospital','store','locality'],synonyms:['Aktivität','Erlebnis','Freizeit']},
sights:{key:'sights',label:'Sehenswürdigkeiten',domainTypes:['attraction'],includedTypes:['tourist_attraction','historical_landmark','monument','observation_deck'],excludedTypes:['restaurant','hospital'],synonyms:['Sehenswürdigkeit','Wahrzeichen','Aussichtspunkt']},
culture:{key:'culture',label:'Kultur',domainTypes:['attraction','activity'],includedTypes:['museum','movie_theater','art_gallery','performing_arts_theater','concert_hall'],excludedTypes:['hospital','restaurant'],synonyms:['Museum','Kino','Theater','Galerie']},
nature:{key:'nature',label:'Natur & Erholung',domainTypes:['nature','activity'],includedTypes:['park','garden','beach','hiking_area','natural_feature','spa'],excludedTypes:['store','hospital'],synonyms:['Park','Garten','See','Strand','Natur']},
shopping:{key:'shopping',label:'Shopping',domainTypes:['shopping'],includedTypes:['shopping_mall','market','store','clothing_store','department_store'],excludedTypes:['hospital'],synonyms:['Shopping','Markt','Geschäft']},
nightlife:{key:'nightlife',label:'Nachtleben',domainTypes:['activity','restaurant'],includedTypes:['night_club','bar','concert_hall'],excludedTypes:['hospital','locality'],synonyms:['Club','Bar','Live-Musik','Rooftop']},
practical:{key:'practical',label:'Praktisch unterwegs',domainTypes:['custom','mobility'],includedTypes:['pharmacy','supermarket','parking','electric_vehicle_charging_station','gas_station','atm','laundry'],excludedTypes:['tourist_attraction'],synonyms:['Apotheke','Supermarkt','Parkplatz','Ladestation']}
});
const INTENTS=Object.freeze({
  skydiving:{category:'activities',label:'Fallschirmspringen',patterns:[/fallschirm/i,/skydiv/i,/tandemsprung/i,/parachut/i,/bodyflying/i,/windtunnel/i],queries:['Fallschirmspringen','Tandemsprung','Skydiving','Fallschirmsprung','Indoor Skydiving','Bodyflying'],match:/fallschirm|skydiv|tandemsprung|parachut|bodyflying|windtunnel|freefall/i,exclude:/tierpark|zoo|museum|trampolin|superfly(?!.*skydiv)/i,niche:true},
  swimming:{category:'activities',label:'Schwimmen',patterns:[/schwimm/i,/baden/i,/badesee/i,/pool/i,/wasserpark/i],queries:['Schwimmbad','Hallenbad','Freibad','Badesee','Therme','Wasserpark','Aquatic Center'],match:/schwimm|hallenbad|freibad|therme|badesee|wasserpark|aquatic|pool/i,niche:false},
  cinema:{category:'culture',label:'Kino',patterns:[/kino/i,/cinema/i,/filmtheater/i],queries:['Kino','Cinema','Filmtheater'],match:/kino|cinema|filmtheater/i,niche:false},
  vegetarian:{category:'food',label:'Vegetarisch essen',patterns:[/vegetar/i,/vegan/i],queries:['Vegetarisches Restaurant','Veganes Restaurant','Vegetarian Restaurant'],match:/vegetar|vegan/i,niche:false},
  pasta:{category:'food',label:'Pasta essen',patterns:[/nudel/i,/pasta/i,/italien/i],queries:['Italienisches Restaurant Pasta','Pasta Restaurant','Vegetarisches Restaurant Nudeln'],match:/pasta|nudel|italien|trattoria|osteria/i,niche:false},
  hidden_gem:{category:'activities',label:'Geheimtipp',patterns:[/nicht jeder tourist/i,/geheimtipp/i,/hidden gem/i,/abseits.*tourist/i,/wenig bekannt/i,/unbekannt/i,/locals? kennen/i,/insider/i],queries:['Geheimtipp','Hidden gem','Lieu insolite','Off the beaten path','Local favorite','Unusual place'],match:null,exclude:null,niche:true}
});
function category(key){return UI_CATEGORIES[key]||UI_CATEGORIES.activities}
function intentFor(text='',categoryKey=''){const value=String(text);for(const [key,intent] of Object.entries(INTENTS)){if(intent.patterns.some(rx=>rx.test(value)))return {key,...intent,category:key==='hidden_gem'?(categoryKey||'activities'):intent.category}}return {key:'generic',category:categoryKey||'activities',label:category(categoryKey).label,queries:[],match:null,exclude:null,niche:false}}
function queryCascade(goal={},destination='',preferences={}){
  const text=String(goal.text||'').trim(),intent=intentFor(text,goal.category),def=category(intent.category||goal.category),diet=JSON.stringify(preferences||{}).toLowerCase();
  let variants=[text,...intent.queries,...def.synonyms];
  if(intent.key==='hidden_gem')variants=[text,`Geheimtipp ${def.label}`,`versteckter besonderer Ort ${def.label}`,`lieu insolite ${def.label}`,`local favorite ${def.label}`,`off the beaten path ${def.label}`,...variants];
  if((intent.category==='food'||goal.category==='food')&&diet.includes('vegetar')&&!/vegetar|vegan/i.test(text))variants=[text,'Vegetarisches Restaurant',...variants];
  return [...new Set(variants.map(v=>`${v} ${destination}`.trim()).filter(Boolean))].slice(0,12)
}
function iconicOrMassTourism(place={}){const name=String(place?.name||'').toLowerCase(),reviews=Number(place?.userRatingCount||place?.user_rating_count||0);return reviews>=12000||/(eiffel|tour eiffel|louvre|arc de triomphe|sacr[ée] coeur|notre dame|mus[ée]e d.?orsay|disneyland|versailles)/i.test(name)}
function semanticSignals(text=''){const q=String(text).toLowerCase();return{hidden:/nicht jeder tourist|geheimtipp|hidden gem|abseits.*tourist|wenig bekannt|unbekannt|locals? kennen|insider/.test(q),quiet:/ruhig|entspannt|wenig los|ohne trubel/.test(q),romantic:/romant|date|hochzeitstag|zu zweit/.test(q),view:/aussicht|blick|view|panorama|rooftop/.test(q),family:/kind|baby|famil|kinderwagen|buggy/.test(q),local:/lokal|local|authentisch|viertel|nachbarschaft/.test(q)}}
function accepts(place,categoryKey,goalText='',preferences={}){
  const intent=intentFor(goalText,categoryKey),def=category(intent.category||categoryKey),types=new Set((place?.types||[]).map(String)),name=String(place?.name||''),summary=String(place?.editorialSummary?.text||place?.editorialSummary||''),hay=`${name} ${summary} ${[...types].join(' ')}`;
  if(!String(place?.providerPlaceId||place?.id||'').replace(/^places\//,'')||name.trim().length<2)return false;
  if(intent.exclude?.test(hay))return false;
  const sem=semanticSignals(goalText);if(sem.hidden&&iconicOrMassTourism(place))return false;
  if(intent.match)return intent.match.test(hay);
  if(def.excludedTypes.some(t=>types.has(t)))return false;
  if(!def.includedTypes.length)return true;
  return def.includedTypes.some(t=>types.has(t))||(categoryKey==='food'&&/restaurant|café|cafe|bistro|pizza|bar/i.test(name));
}
function relevance(place,goalText='',categoryKey='',preferences={}){
  const intent=intentFor(goalText,categoryKey),types=(place?.types||[]).join(' '),hay=`${place?.name||''} ${place?.editorialSummary?.text||place?.editorialSummary||''} ${types}`.toLowerCase(),reasons=[];let score=0;
  if(intent.match?.test(hay)){score+=48;reasons.push(`Passt direkt zu „${intent.label}“`)}
  const tokens=String(goalText).toLowerCase().split(/[^a-zäöüß0-9]+/).filter(x=>x.length>3);const matched=tokens.filter(t=>hay.includes(t));if(matched.length){score+=Math.min(20,matched.length*6);reasons.push(`Greift eure konkrete Suche auf: ${matched.slice(0,3).join(', ')}`)}
  const sem=semanticSignals(goalText);if(sem.hidden){if(iconicOrMassTourism(place)){score-=90;reasons.push('Zu bekannt für den gewünschten Geheimtipp-Fokus')}else{const reviews=Number(place?.userRatingCount||0);score+=reviews<2500?30:reviews<7000?12:-8;reasons.push('Priorisiert weniger offensichtliche Orte statt klassischer Top-Sehenswürdigkeiten')}}
  if(sem.quiet&&/quiet|calm|ruhig|garden|park|courtyard|bibliothek|library|chapel|passage|square/.test(hay)){score+=14;reasons.push('Passt zum Wunsch nach einer ruhigeren Atmosphäre')}
  if(sem.view&&/view|panorama|rooftop|terrace|aussicht|tower|deck/.test(hay)){score+=16;reasons.push('Bietet Hinweise auf Aussicht oder Panorama')}
  if(sem.family&&/family|kid|child|baby|park|zoo|aquarium|play/.test(hay)){score+=12;reasons.push('Passt zum Familien-/Kinder-Kontext')}
  const prefs=JSON.stringify(preferences||{}).toLowerCase();if((categoryKey==='food'||intent.category==='food')&&prefs.includes('vegetar')){if(place?.servesVegetarianFood===true||/vegetar|vegan/.test(hay)){score+=24;reasons.push('Passt zu eurem vegetarischen Profil-Kompass')}else{score-=8;reasons.push('Vegetarische Eignung ist noch nicht eindeutig belegt')}}
  return {score,reasons,intent};
}
function diagnostics(){return{version:VERSION,status:'ready',uiCategories:Object.keys(UI_CATEGORIES).length,intents:Object.keys(INTENTS),singleRegistry:true}}
window.LuviaGlobalPlaceContracts=Object.freeze({version:VERSION,categories:UI_CATEGORIES,intents:INTENTS,category,intentFor,queryCascade,accepts,relevance,diagnostics});
})();