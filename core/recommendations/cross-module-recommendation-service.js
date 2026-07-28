(() => {
'use strict';
const VERSION='4.1.3.4',KEY='luvia.cross-module.v4';
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const state={status:'ready',tripId:null,slots:{forYou:[],rightNow:[],nearby:[],onYourWay:[],next:[],alternative:[]},candidates:[],lastUpdatedAt:null,lastError:null,offline:false,freeWindowTrace:[]};
const tripId=()=>String(window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||'');
const score=p=>Number(p?.intelligence?.score??p?.matchScore??p?.metadata?.matchScore??0);
const dist=p=>Number.isFinite(Number(p?.distanceMeters))?Number(p.distanceMeters):Infinity;
const visitMinutes=p=>Math.max(15,Number(p?.minimumVisitMinutes||p?.metadata?.minimumVisitMinutes||p?.metadata?.recommendedDurationMinutes||45));
const travelMinutes=p=>Number.isFinite(dist(p))?Math.max(1,Math.ceil(dist(p)/75)):null;
const textOf=p=>[p?.name,p?.title,p?.primaryType,p?.entityType,...(p?.roles||[]),...(p?.types||[]),...(p?.metadata?.types||[])].filter(Boolean).join(' ').toLowerCase();
function placeCategory(p){
  const type=String(p?.primaryType||p?.entityType||'custom');
  if(type!=='restaurant')return type;
  const text=textOf(p);
  if(/eis|ice[ -]?cream|gelato|dessert|waffel|patisserie|konditorei/.test(text))return'restaurant.dessert';
  if(/café|cafe|coffee|kaffee|bäck|bakery|frühstück|breakfast|brunch/.test(text))return'restaurant.cafe';
  if(/bar|pub|cocktail|weinbar|wine bar/.test(text))return'restaurant.bar';
  return'restaurant.meal';
}
function scheduledCategoryCounts(){
  const counts=new Map();
  const schedule=window.LuviaScheduleIntelligence?.snapshot?.()||{};const todayKey=new Date().toISOString().slice(0,10);const events=(schedule.events||[]).filter(event=>event.date===todayKey);
  for(const event of events){
    const category=placeCategory({...event,...(event.source||{}),name:event.title||event.name});
    counts.set(category,(counts.get(category)||0)+1);
  }
  return counts;
}
function categoryAllowed(place,selectedCounts,scheduledCounts){
  const category=placeCategory(place),type=String(place?.primaryType||place?.entityType||'custom');
  if(type!=='restaurant')return{ok:(selectedCounts.get(type)||0)<1,category,reason:'place-type-diversity'};
  const scheduledMeals=scheduledCounts.get('restaurant.meal')||0;
  const scheduledCafe=(scheduledCounts.get('restaurant.cafe')||0)+(scheduledCounts.get('restaurant.dessert')||0);
  const scheduledFood=[...scheduledCounts.entries()].filter(([key])=>key.startsWith('restaurant.')).reduce((sum,[,value])=>sum+value,0);
  if(scheduledFood>=2)return{ok:false,category,reason:'daily-food-place-limit-reached'};
  if(category==='restaurant.meal'&&scheduledMeals>=1)return{ok:false,category,reason:'daily-meal-restaurant-already-planned'};
  if((category==='restaurant.cafe'||category==='restaurant.dessert')&&scheduledCafe>=1)return{ok:false,category,reason:'daily-cafe-dessert-already-planned'};
  const cap=category==='restaurant.meal'?1:1;
  return{ok:(selectedCounts.get(category)||0)<cap,category,reason:'restaurant-category-diversity'};
}

function normalizedPlaces(){const id=tripId();return (window.LuviaPlaceCore?.getPlaces?.({tripId:id})||[]).map(p=>{const coordinates=p.coordinates||p.location||{latitude:p.latitude,longitude:p.longitude};const liveDistance=window.LuviaTravelContext?.distanceTo?.(coordinates);return{...p,matchScore:score(p),distanceMeters:Number.isFinite(liveDistance)?liveDistance:null,distanceSource:Number.isFinite(liveDistance)?'gps':'unavailable',openNow:p.openNow??p.metadata?.openNow,minimumVisitMinutes:visitMinutes(p)}})}
function rank(list){return [...list].sort((a,b)=>score(b)-score(a)||dist(a)-dist(b))}
function build(input=[]){const all=rank(input.length?input:normalizedPlaces()).filter(p=>!['visited','memory','rated','travel_book'].includes(String(p.lifecycle||'')));const open=all.filter(p=>p.openNow!==false),near=rank(open).sort((a,b)=>dist(a)-dist(b));const schedule=window.LuviaScheduleIntelligence?.snapshot?.()||{};state.candidates=all;state.slots={forYou:all.slice(0,8),rightNow:open.slice(0,8),nearby:near.slice(0,8),onYourWay:near.filter(p=>dist(p)<5000).slice(0,8),next:schedule.next?all.filter(p=>String(p.id)!==String(schedule.next.id)).slice(0,6):all.slice(0,6),alternative:all.slice(1,7)};state.lastUpdatedAt=new Date().toISOString();state.lastError=null;state.offline=!navigator.onLine;try{localStorage.setItem(KEY,JSON.stringify(state))}catch{};window.dispatchEvent(new CustomEvent('luvia:cross-module-recommendations-changed',{detail:snapshot()}));return snapshot()}
async function hydrateRestaurants(){const id=tripId(),existing=window.LuviaRestaurantIntelligence?.snapshot?.()?.restaurants||[];if(existing.length)return existing;if(id&&window.LuviaRestaurants?.list){const r=await window.LuviaRestaurants.list({tripId:id});return (r?.data?.entities||[]).map(window.LuviaRestaurants.entityToEntry).map(x=>window.LuviaRestaurantIntelligence?.enrich?.(x,[])||x)}return[]}
async function refresh(options={}){state.tripId=String(options.tripId||tripId());try{let places=normalizedPlaces();const restaurants=await hydrateRestaurants();const ids=new Set(places.map(p=>String(p.id)));for(const r of restaurants){const p=window.LuviaPlaceCore?.normalizePlace?.(r,{type:'restaurant'})||r;if(!ids.has(String(p.id))){places.push(p);ids.add(String(p.id))}}return build(places)}catch(e){state.lastError=e?.message||String(e);try{const cached=JSON.parse(localStorage.getItem(KEY)||'null');if(cached)Object.assign(state,cached,{offline:true,status:'cached'})}catch{}return snapshot()}}
function fitFreeWindow(windowInfo,limit=4){
  const mins=Math.max(0,Number(windowInfo?.minutes||0)),trace=[],scheduledCounts=scheduledCategoryCounts();
  const eligible=state.candidates.filter(place=>{
    const travel=travelMinutes(place),visit=visitMinutes(place),transition=10,required=(travel??15)+visit+transition,remaining=mins-required;
    const baseAccepted=place.openNow!==false&&remaining>=0&&!['visited','memory','rated','travel_book'].includes(String(place.lifecycle||''));
    trace.push({id:place.id||place.placeId||place.name,name:place.name||place.title,type:place.primaryType||place.entityType,category:placeCategory(place),windowMinutes:mins,travelMinutes:travel,visitMinutes:visit,transitionMinutes:transition,requiredMinutes:required,remainingMinutes:remaining,accepted:baseAccepted,reason:place.openNow===false?'geschlossen':remaining<0?'zu wenig Zeit':baseAccepted?'zeitlich passend':'bereits besucht'});
    return baseAccepted;
  }).map(place=>{
    const travel=travelMinutes(place),visit=visitMinutes(place),required=(travel??15)+visit+10,remaining=mins-required;
    const fitScore=Math.round(Math.max(0,Math.min(100,score(place)*.7+Math.min(20,remaining/3)+Math.max(0,10-(travel??15)/3))));
    return{...clone(place),recommendationCategory:placeCategory(place),fit:{windowMinutes:mins,travelMinutes:travel,visitMinutes:visit,transitionMinutes:10,requiredMinutes:required,remainingMinutes:remaining,fitScore,reason:`Passt mit etwa ${visit} Minuten Aufenthalt in euer freies Zeitfenster.`}};
  });
  const selectedCounts=new Map(),diverse=[];
  for(const item of rank(eligible).sort((a,b)=>(b.fit?.fitScore||0)-(a.fit?.fitScore||0))){
    const rule=categoryAllowed(item,selectedCounts,scheduledCounts);
    if(!rule.ok){trace.push({id:item.id||item.placeId,name:item.name||item.title,type:item.primaryType||item.entityType,category:rule.category,accepted:false,reason:rule.reason});continue;}
    selectedCounts.set(rule.category,(selectedCounts.get(rule.category)||0)+1);
    diverse.push(item);
    if(diverse.length>=limit)break;
  }
  state.freeWindowTrace=trace.slice(0,100);return diverse;
}
function getSlot(name){return clone(state.slots[name]||[])}function snapshot(){return clone(state)}
window.LuviaCrossModuleRecommendations=Object.freeze({version:VERSION,refresh,build,getSlot,fitFreeWindow,snapshot,diagnostics:snapshot});
['luvia:restaurant-intelligence-changed','luvia:schedule-intelligence-changed','luvia:restaurants-v2-updated','luvia:travel-context-changed','luvia:global-location-updated','luvia:place-visit-changed','online'].forEach(n=>window.addEventListener(n,()=>refresh().catch(()=>{})));window.addEventListener('offline',()=>{state.offline=true});
})();
