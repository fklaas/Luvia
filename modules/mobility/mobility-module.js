(()=>{'use strict';
const MODULE_ID='mobility',VERSION='4.16.2';
const QUICK=[['✈️','Flüge','Flughäfen'],['🚆','Bahn','Bahn'],['🚌','Bus & Fernbus','Bus & Fernbus'],['⛴️','Fähren','Fähren'],['🚇','Nahverkehr','Nahverkehr'],['🚕','Taxi','Taxi'],['🚗','Vermietung','Vermietung'],['🅿️','Parken & Laden','Parken & Laden']];
const PRESETS=Object.freeze({
 flights:{key:'flights',title:'Flüge',description:'Flughäfen, Terminals und die An- oder Abreise rund um euren Flug planen.',discoveryTitle:'Welche Flughäfen sind für eure Reise relevant?',placeholder:'Flughafen, Terminal oder Airport',query:'Flughäfen'},
 rail:{key:'rail',title:'Bahn',description:'Fern-, Regional- und wichtige Umsteigebahnhöfe am Reiseziel finden.',discoveryTitle:'Welche Bahnstation passt zu eurer Reise?',placeholder:'Hauptbahnhof, Fernbahnhof oder Regionalbahnhof',query:'Bahn'},
 coaches:{key:'coaches',title:'Bus & Fernbus',description:'Fernbusbahnhöfe, Busstationen und wichtige Haltepunkte entdecken.',discoveryTitle:'Wo starten Bus und Fernbus?',placeholder:'Fernbusbahnhof, Busbahnhof oder Haltestelle',query:'Bus & Fernbus'},
 ferries:{key:'ferries',title:'Fähren',description:'Fährterminals und relevante Hafenverbindungen für eure Reise finden.',discoveryTitle:'Welche Fährterminals liegen passend?',placeholder:'Fährterminal oder Fähre',query:'Fähren'},
 local:{key:'local',title:'Nahverkehr',description:'Metro, U-Bahn, S-Bahn, Straßenbahn und Bus für Wege vor Ort.',discoveryTitle:'Wie kommt ihr vor Ort am besten weiter?',placeholder:'Metro, U-Bahn, S-Bahn, Tram oder Bus',query:'Nahverkehr'},
 taxi:{key:'taxi',title:'Taxi & Fahrdienste',description:'Taxistände und lokale Fahrdienste für flexible Wege am Reiseziel.',discoveryTitle:'Wo findet ihr Taxi und Transfer?',placeholder:'Taxistand, Taxi oder Transfer',query:'Taxi'},
 rental:{key:'rental',title:'Vermietung',description:'Mietwagen und Sharing-Angebote für eure Reise finden.',discoveryTitle:'Welches Miet- oder Sharing-Angebot passt?',placeholder:'Mietwagen, Autovermietung oder Sharing',query:'Vermietung'},
 parking:{key:'parking',title:'Parken & Laden',description:'Parkhäuser, Park-and-Ride sowie E-Auto- und E-Bike-Ladepunkte.',discoveryTitle:'Wo könnt ihr parken oder laden?',placeholder:'Parkhaus, P+R oder Ladestation',query:'Parken & Laden'}
});
const SEARCH_PLANS=Object.freeze({
 'Flughäfen':[
  {type:'airport',query:'Flughafen',accept:['airport','international_airport']},
  {type:'international_airport',query:'Internationaler Flughafen',accept:['international_airport','airport']}
 ],
 'Bahn':[
  {type:'train_station',query:'Hauptbahnhof',accept:['train_station']},
  {type:'train_station',query:'Fernbahnhof',accept:['train_station']},
  {type:'train_station',query:'Regionalbahnhof',accept:['train_station']},
  {type:'train_ticket_office',query:'Bahn Reisezentrum',accept:['train_ticket_office']}
 ],
 'Bus & Fernbus':[
  {type:'bus_station',query:'Fernbusbahnhof',accept:['bus_station']},
  {type:'bus_station',query:'Busbahnhof',accept:['bus_station']},
  {type:'bus_stop',query:'Zentrale Bushaltestelle',accept:['bus_stop']}
 ],
 'Fähren':[
  {type:'ferry_terminal',query:'Fährterminal',accept:['ferry_terminal']},
  {type:'ferry_service',query:'Fährverbindung',accept:['ferry_service']},
 ],
 'Nahverkehr':[
  {type:'subway_station',query:'Metro U-Bahn Station',accept:['subway_station']},
  {type:'light_rail_station',query:'S-Bahn Stadtbahn Station',accept:['light_rail_station','transit_station']},
  {type:'tram_stop',query:'Straßenbahnhaltestelle',accept:['tram_stop']},
  {type:'bus_station',query:'Busbahnhof Nahverkehr',accept:['bus_station']},
  {type:'bus_stop',query:'Bushaltestelle Nahverkehr',accept:['bus_stop']}
 ],
 'Taxi':[
  {type:'taxi_stand',query:'Taxistand',accept:['taxi_stand']},
  {type:'taxi_service',query:'Taxi Fahrdienst',accept:['taxi_service','taxi_stand']},
 ],
 'Vermietung':[
  {type:'car_rental',query:'Mietwagen Autovermietung',accept:['car_rental']},
  {type:'bike_sharing_station',query:'Bike Sharing Station',accept:['bike_sharing_station']}
 ],
 'Parken & Laden':[
  {type:'park_and_ride',query:'Park and Ride',accept:['park_and_ride']},
  {type:'parking_garage',query:'Parkhaus',accept:['parking_garage']},
  {type:'parking_lot',query:'Parkplatz',accept:['parking_lot','parking']},
  {type:'electric_vehicle_charging_station',query:'Elektroauto Ladestation',accept:['electric_vehicle_charging_station']},
  {type:'ebike_charging_station',query:'E-Bike Ladestation',accept:['ebike_charging_station']}
 ]
});
const PLAN_BY_QUERY=Object.freeze(Object.fromEntries(QUICK.map(([,label,query])=>[query,SEARCH_PLANS[query]||SEARCH_PLANS[label]||[]])));
const state={root:null,trip:null,query:PRESETS.local.query,filter:PRESETS.local.query,view:PRESETS.local,options:{},results:[],entities:[],searchMap:new Map(),routeCache:new Map(),loading:false,error:null,visibleCount:6};
const esc=v=>window.LuviaPlaceExperience?.esc?.(v)||String(v??'');
const activeTrip=()=>state.trip||window.LuviaTripStore?.snapshot?.().activeTrip||window.LuviaTripContext?.getActiveTrip?.()||null;
const tripId=()=>activeTrip()?.tripId||activeTrip()?.id||window.LuviaTripStore?.snapshot?.().activeTripId;
const destination=()=>state.trip?.destination?.name||state.trip?.destinationName||window.LuviaDestination?.getActive?.()?.canonicalCity?.name||'eurem Reiseziel';
const place=e=>e?.place||e||{},link=e=>e?.tripPlace||e?.trip_place||{};
const ext=e=>{const legacy=e?.extension||e?.mobility||{},id=link(e)?.id||e?.tripPlaceId;const cloud=id?window.LuviaTripPlaceData?.recordForTripPlace?.(id)?.fields||{}:{};return {...legacy,...cloud}};
const providerId=p=>String(p?.providerPlaceId||p?.provider_place_id||p?.sourceId||p?.source_id||p?.id||'').replace(/^places\//,'');
const fmtDistance=m=>{m=Number(m);if(!Number.isFinite(m))return null;return m<1000?`${Math.round(m/50)*50} m`:`${(m/1000).toFixed(m<10000?1:0).replace('.',',')} km`};
const MODE_SYMBOLS=Object.freeze({'Flughafen':'✈️','Bahn & Fernverkehr':'🚆','Metro oder Stadtbahn':'🚇','Straßenbahn':'🚋','Bus':'🚌','Fähre':'⛴️','Taxi':'🚕','Mietwagen':'🚗','E-Auto-Ladestation':'⚡','E-Bike-Ladestation':'⚡','Bike-Sharing':'🚲','Park-and-Ride':'🅿️','Parkhaus':'🅿️','Parkplatz':'🅿️','ÖPNV-Station':'🚉','Mobilitätspunkt':'🚉'});
function rawTypes(p={}){return new Set([p.primaryType,...(p.types||[])].filter(Boolean))}
function acceptsPlan(p,plan){const types=rawTypes(p),accepted=plan?.accept||[plan?.type].filter(Boolean);return !accepted.length||accepted.some(type=>types.has(type))}
function isMobilityPlace(p={}){const types=rawTypes(p);return ['airport','international_airport','train_station','train_ticket_office','transit_station','transit_stop','subway_station','light_rail_station','tram_stop','bus_station','bus_stop','ferry_terminal','ferry_service','taxi_stand','taxi_service','car_rental','bike_sharing_station','park_and_ride','parking','parking_garage','parking_lot','electric_vehicle_charging_station','ebike_charging_station'].some(type=>types.has(type))}
function modeFor(p={}){return window.LuviaTransportIntelligence?.mode?.(p)?.value||'Mobilitätspunkt'}
function displayNameFor(p={}){const raw=String(p.name||p.displayName||'Mobilitätspunkt').trim()||'Mobilitätspunkt',mode=modeFor(p);if(raw.toLowerCase().includes(String(mode).toLowerCase()))return raw;const tokens={Flughafen:/flughafen|airport|aéroport|aeroporto/i,'Bahn & Fernverkehr':/bahnhof|gare|station ferroviaire|railway|train/i,'Metro oder Stadtbahn':/metro|u-bahn|stadtbahn|s-bahn/i,Straßenbahn:/tram|straßenbahn/i,Bus:/bus|zob/i,Fähre:/fähre|ferry|terminal maritime/i,Taxi:/taxi/i,Mietwagen:/mietwagen|autovermietung|car rental/i,'E-Auto-Ladestation':/lade|charging/i,'E-Bike-Ladestation':/lade|charging/i,'Bike-Sharing':/bike|velo|vélib|sharing/i,'Park-and-Ride':/park|p\+r/i,Parkhaus:/parkhaus|parking|garage/i,Parkplatz:/parkplatz|parking/i,'ÖPNV-Station':/station|haltestelle/i};return tokens[mode]?.test(raw)?raw:`${raw} · ${mode}`}
function descriptionFor(p={}){const profile=window.LuviaTransportIntelligence?.analyze?.(p,{trip:state.trip})||{};return [modeFor(p),profile.transportRole?.value,p.editorialSummary||p.description].filter(Boolean).filter((value,index,list)=>list.indexOf(value)===index).join(' · ')}

function normalized(p,l={}){const mode=modeFor(p);return {...p,id:p.id||p.placeId||providerId(p),placeId:p.id||p.placeId,primaryType:'mobility',name:displayNameFor(p),symbol:MODE_SYMBOLS[mode]||'🚉',lifecycle:l.status||p.lifecycleStatus||'discovered',address:p.shortAddress||p.formattedAddress||p.formatted_address||p.address||'',description:descriptionFor(p),matchScore:p.matchScore||p.match_score||Math.max(50,Math.min(96,Math.round((Number(p.rating)||3.8)*17))),metadata:{...(p.metadata||{}),tripPlaceId:l.id,moveView:state.view?.key||'local'}}}
async function photoUris(photos,max=6){const out=[];for(const photo of (photos||[]).slice(0,max)){try{if(photo.uri||photo.url){out.push({uri:photo.uri||photo.url});continue}const r=await window.LuviaPlaces.photo(photo.name,{maxWidthPx:1200,maxHeightPx:900});if(r?.data?.photoUri)out.push({uri:r.data.photoUri})}catch{}}return out}
async function hydrate(places){await Promise.all((places||[]).slice(0,30).map(async p=>{if(!p._cardPhotoUri&&p.photos?.length){const x=await photoUris(p.photos,1);if(x[0])p._cardPhotoUri=x[0].uri}}))}
function intelligence(p,e=null){const base=window.LuviaPlaceIntelligence?.analyze?.('mobility',p,{trip:state.trip,destination:destination(),extension:ext(e)})||{};const profile=window.LuviaTransportIntelligence?.analyze?.(p,{trip:state.trip,extension:ext(e)})||{};return{...base,transport:profile,score:base.score||p.matchScore||75,distanceLabel:base.distanceLabel||fmtDistance(p.distanceMeters),bestTime:base.bestTime||null,bestTimeReason:base.bestTimeReason||null,reasons:[...(base.reasons||[]),...(profile.travelReasons||[])],warnings:base.warnings||[]}}
function resultCard(p,favoriteEntity=null){const added=Boolean(favoriteEntity);p=normalized(p);const intel=intelligence(p);return window.LuviaPlaceUI.card(p,{className:'rv2-search-card rv2-search-card-intelligent move-result-card',openAttribute:`data-place-card-open="result:${esc(providerId(p))}"`,media:p._cardPhotoUri?`<div class="rv2-card-media"><img src="${esc(p._cardPhotoUri)}" alt="${esc(p.name)}" loading="eager" fetchpriority="high" decoding="sync"></div>`:`<div class="rv2-card-media is-placeholder"><span>${esc(p.symbol||'🚉')}</span></div>`,intelligence:intel,actions:`<button type="button" class="rv2-detail-button primary" data-place-card-open="result:${esc(providerId(p))}">Details ansehen</button>${window.LuviaPlaceCollections.favoriteButton({placeType:'mobility',providerPlaceId:providerId(p),tripPlaceId:favoriteEntity?link(favoriteEntity).id:'',isFavorite:added})}`})}
function savedCard(e){const p=normalized(place(e),link(e)),l=link(e),intel=intelligence(p,e);return window.LuviaPlaceUI.card(p,{className:'rv2-search-card rv2-search-card-intelligent move-result-card',openAttribute:`data-place-card-open="saved:${esc(l.id)}"`,media:p._cardPhotoUri?`<div class="rv2-card-media"><img src="${esc(p._cardPhotoUri)}" alt="${esc(p.name)}" loading="eager" fetchpriority="high"></div>`:`<div class="rv2-card-media is-placeholder"><span>${esc(p.symbol||'🚉')}</span></div>`,intelligence:intel,actions:`<button type="button" class="rv2-detail-button primary" data-place-card-open="saved:${esc(l.id)}">Details ansehen</button>${window.LuviaPlaceCollections.favoriteButton({placeType:'mobility',providerPlaceId:providerId(p),tripPlaceId:l.id,isFavorite:Boolean(l.is_favorite)})}`})}
async function hydrateFavoriteMedia(){const favorites=state.entities.filter(e=>link(e).is_favorite===true).filter(e=>providerId(place(e))&&!place(e)._cardPhotoUri).slice(0,6);if(!favorites.length)return;let changed=false;for(const entity of favorites){const p=place(entity),id=providerId(p);try{const prepared=await window.LuviaPlaceDetails?.prepare?.(id,{regionCode:'DE',photoLimit:1});const detail=prepared?.place||prepared?.response?.data?.place||{};Object.assign(p,detail,{providerPlaceId:id,primaryType:'mobility'});const photos=prepared?.photos?.length?prepared.photos:await photoUris((detail.photos||[]).slice(0,1),1);if(photos[0]?.uri){p._cardPhotoUri=photos[0].uri;changed=true}state.searchMap.set(id,p)}catch(_){}}if(changed&&state.root?.isConnected)render()}
function moveActions(l,p={}){const id=providerId(p),saved=Boolean(l?.is_favorite),favorite=l?.id?`<button type="button" data-fav>${saved?'♥ Gemerkt':'♡ Merken'}</button>`:`<button type="button" data-import-detail>♡ Merken</button>`;const maps=p.googleMapsUri||p.google_maps_uri||(id?`https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id)}`:'');return `${favorite}${maps?`<a class="luv-place-route-link" href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Route ansehen ↗</a>`:''}`}
async function load(){try{await window.LuviaTripPlaceData?.hydrate?.(tripId());const r=await window.LuviaPlaceEntities.list({tripId:tripId(),type:'mobility'});state.entities=(r?.data?.entities||[]).filter(e=>link(e).status!=='archived');window.LuviaPlaceCollections?.remember?.('mobility',state.entities,tripId());await hydrate(state.entities.map(place));state.error=null}catch(e){state.error=e.message||String(e)}render();hydrateFavoriteMedia().catch(()=>{})}
async function search(query=state.query,options={}){
 state.visibleCount=6;
 state.query=String(query||state.view?.query||PRESETS.local.query).trim()||PRESETS.local.query;
 state.filter=state.query;
 state.options=options;
 state.loading=true;
 state.error=null;
 render();
 try{
  if(options.discoveryContract){
   const response=await window.LuviaDiscoveryContracts.search({tripId:tripId(),type:'mobility',contract:options.discoveryContract,maxResultCount:24});
   state.results=(response?.data?.places||[]).filter(isMobilityPlace).map(item=>({...item,_movePlan:state.view?.key||null,_moveMode:modeFor(item)}));
   await hydrate(state.results);
   state.searchMap=new Map(state.results.map(item=>[providerId(item),item]));
   state.loading=false;render();return;
  }
  const planned=PLAN_BY_QUERY[state.query]||[];
  const plans=planned.length?planned:[{type:'',query:state.query,accept:[]}];
  const responses=await Promise.all(plans.slice(0,8).map(async item=>({
   item,
   response:await window.LuviaPlaceEntities.searchPlaces({
    tripId:tripId(),
    type:'mobility',
    includedType:item.type||'',
    query:item.query,
    maxResultCount:12,
    strictDestination:!['airport','international_airport','ferry_terminal','ferry_service','car_rental'].includes(item.type),
    minRating:options.minRating,
    sortBy:options.sortBy||'distance',
    openNow:options.openNow||false
   }).catch(error=>({error,data:{places:[]}}))
  })));
  const merged=new Map();
  for(const entry of responses){
   for(const raw of (entry.response?.data?.places||[])){
    const id=providerId(raw);
    if(!id||raw.businessStatus==='CLOSED_PERMANENTLY'||!isMobilityPlace(raw)||!acceptsPlan(raw,entry.item))continue;
    const candidate={...raw,_movePlan:state.view?.key||null,_moveMode:modeFor(raw)};
    const current=merged.get(id);
    if(!current||Number(candidate.rating||0)>Number(current.rating||0))merged.set(id,candidate);
   }
  }
  const typeScore=value=>['train_station','airport','international_airport','ferry_terminal','bus_station'].includes(value.primaryType)?2:1;
  state.results=[...merged.values()].sort((a,b)=>typeScore(b)-typeScore(a)||Number(a.distanceMeters??Infinity)-Number(b.distanceMeters??Infinity)||Number(b.rating||0)-Number(a.rating||0)||Number(b.userRatingCount||0)-Number(a.userRatingCount||0)).slice(0,30);
  await hydrate(state.results);
  state.searchMap=new Map(state.results.map(item=>[providerId(item),item]));
 }catch(error){state.error=error.message||String(error)}
 state.loading=false;
 render();
}
async function importOne(id,{silent=false,status='idea',favorite=true}={}){try{const seed=state.searchMap.get(String(id))||state.results.find(x=>providerId(x)===String(id))||{};const profile=window.LuviaTransportIntelligence?.analyze?.(seed,{trip:state.trip})||{};const response=await window.LuviaPlaceEntities.importPlace(id,{tripId:tripId(),type:'mobility',tripPlace:{status,isFavorite:favorite},extension:{mobility_mode:profile.mobilityMode?.value||null,transport_role:profile.transportRole?.value||null,transfer_buffer:profile.transferBuffer?.value||null,access_hint:profile.accessHint?.value||null,operating_hint:profile.operatingHint?.value||null,parking_hint:profile.parkingHint?.value||null,charging_hint:profile.chargingHint?.value||null,ticket_hint:profile.ticketHint?.value||null,decision_sources:{mode:profile.mobilityMode?.source||null,role:profile.transportRole?.source||null,buffer:profile.transferBuffer?.source||null}}});await load();const entity=state.entities.find(e=>providerId(place(e))===String(id))||response?.data?.entity||response?.data?.tripPlaceEntity||null;if(!silent)window.LuviaUIKit?.toast?.('Move-Punkt als Favorit gespeichert.',{type:'success'});return entity}catch(e){state.error=e.message||String(e);render();throw e}}
function transportGuidance(profile={}){const value=x=>x?.value||'Noch nicht eindeutig';return window.LuviaPlaceUI.insightGrid({className:'luv-transport-guidance',eyebrow:'Mobilitäts-Intelligence',title:'Verkehrsart, Nutzung und Reiseplanung',description:'Move ordnet den Mobilitätspunkt anhand verlässlicher Google-Place-Daten ein.',symbol:'🚉',items:[{label:'Verkehrsart',icon:'🚉',value:value(profile.mobilityMode),source:profile.mobilityMode?.source,confidence:profile.mobilityMode?.confidence,featured:true},{label:'Rolle in der Reise',icon:'🧭',value:value(profile.transportRole),source:profile.transportRole?.source,confidence:profile.transportRole?.confidence,featured:true},{label:'Zeitpuffer',icon:'⏱️',value:value(profile.transferBuffer),source:profile.transferBuffer?.source,confidence:profile.transferBuffer?.confidence,wide:true},{label:'Betrieb und Zeiten',icon:'🕒',value:value(profile.operatingHint),source:profile.operatingHint?.source,confidence:profile.operatingHint?.confidence},{label:'Barrierefreiheit',icon:'♿',value:value(profile.accessHint),source:profile.accessHint?.source,confidence:profile.accessHint?.confidence},{label:'Parken',icon:'🅿️',value:value(profile.parkingHint),source:profile.parkingHint?.source,confidence:profile.parkingHint?.confidence},{label:'Laden',icon:'⚡',value:value(profile.chargingHint),source:profile.chargingHint?.source,confidence:profile.chargingHint?.confidence},{label:'Ticket oder Nutzung',icon:'🎫',value:value(profile.ticketHint),source:profile.ticketHint?.source,confidence:profile.ticketHint?.confidence}],note:profile.decisionNote||'Live-Abfahrten, Belegung, Preise und Verspätungen müssen beim Betreiber geprüft werden.'})}
function guidanceFor(p,e=null){return transportGuidance(window.LuviaTransportIntelligence?.analyze?.(p,{trip:state.trip,extension:ext(e)})||{})}
async function detail(raw,l=null,e=null){let p=normalized(raw,l||{});const overlay=window.LuviaPlaceDetail.openLoading({typeLabel:'Move'});const initialIntel=intelligence(p,e);window.LuviaPlaceDetail.update(overlay,{placeType:'mobility',place:p,photos:p._cardPhotoUri?[{uri:p._cardPhotoUri}]:[],intelligence:initialIntel,destination:destination(),typeLabel:'Move',primaryActions:moveActions(l,p),lifecycle:{title:'Move-Lebenszyklus',status:l?.status||'discovered',order:['discovered','favorite','visited','rated']},capabilityContent:guidanceFor(p,e),alternativesContent:'<p class="rv2-muted">Weitere Details werden geladen …</p>'});bindDetail(overlay,p,l,e);try{const prepared=await window.LuviaPlaceDetails.prepare(providerId(p),{regionCode:'DE',photoLimit:6,seedPlace:p});p=normalized({...p,...prepared.place},l||{});const photos=prepared.photos?.length?prepared.photos:await photoUris(p.photos);const intel=intelligence(p,e),alts=(state.results||[]).filter(a=>providerId(a)!==providerId(p)).slice(0,3);const alternatives=alts.length?`<div class="rv2-alternatives">${alts.map(a=>`<button type="button" class="luv-place-alternative" data-place-alternative="${esc(providerId(a))}"><span><strong>${esc(a.name||'Alternative')}</strong><small>Alternative aus der aktuellen Suche</small></span><b>${esc(intelligence(a).score)} %</b></button>`).join('')}</div>`:'<p class="rv2-muted">Noch keine Alternativen verfügbar.</p>';window.LuviaPlaceDetail.update(overlay,{placeType:'mobility',place:p,photos,intelligence:intel,destination:destination(),typeLabel:'Move',primaryActions:moveActions(l,p),lifecycle:{title:'Move-Lebenszyklus',status:l?.status||'discovered',order:['discovered','favorite','visited','rated']},capabilityContent:guidanceFor(p,e),alternativesContent:alternatives});bindDetail(overlay,p,l,e)}catch(error){console.warn('[Luvia Mobilität] Details konnten nicht vollständig geladen werden.',error)}}
function bindDetail(overlay,p,l,e){const root=overlay.node;root.querySelector('[data-import-detail]')?.addEventListener('click',async ev=>{ev.stopPropagation();const imported=await importOne(providerId(p),{silent:true});overlay.close();if(imported)detail(place(imported),link(imported),imported)});root.querySelector('[data-fav]')?.addEventListener('click',async ev=>{ev.stopPropagation();await window.LuviaPlaceCommands.toggleFavorite({tripId:tripId(),placeType:'mobility',tripPlaceId:l.id,entity:e,isFavorite:!l.is_favorite,status:l.status||'idea'});overlay.close();load()});root.querySelectorAll('[data-place-alternative]').forEach(button=>button.addEventListener('click',()=>{const a=state.searchMap.get(button.dataset.placeAlternative);if(a)detail(a)}))}
function render(){const r=state.root;if(!r)return;const accent=state.trip?.accent||state.trip?.theme?.accent||getComputedStyle(document.documentElement).getPropertyValue('--lv-accent').trim()||'#ee6f83';r.className='luvia-restaurants-v2 luvia-move-module';for(const key of ['--trip-accent','--module-accent','--rv2-accent','--place-accent'])r.style.setProperty(key,accent);const favorites=state.entities.filter(e=>link(e).is_favorite===true);const visible=state.results.slice(0,Math.max(6,state.visibleCount||6));const more=state.results.length>visible.length?`<button type="button" class="luv-place-load-more" data-place-more>Weitere ${Math.min(6,state.results.length-visible.length)} Ergebnisse anzeigen</button>`:'';const results=state.loading?'<div class="rv2-search-loading"><span></span><span></span><span></span></div>':state.error?window.LuviaPlaceUIStates?.error?.(state.error)||`<div class="rv2-library-empty">${esc(state.error)}</div>`:visible.length?visible.map(item=>resultCard(item,state.entities.find(entity=>link(entity).is_favorite===true&&providerId(place(entity))===providerId(item))||null)).join('')+more:`<div class="rv2-library-empty">Keine passenden ${esc(state.view?.title||'Move')}-Ergebnisse am Reiseziel gefunden. Luvia zeigt bewusst keine fachfremden Treffer.</div>`;const discovery=window.LuviaPlaceExperience.discovery({destination:destination(),title:state.view?.discoveryTitle||'Wie möchtet ihr unterwegs sein?',description:state.view?.description||'Mobilität für eure Reise – klar nach Verkehrsmittel getrennt.',placeholder:state.view?.placeholder||'Bahnhof, Flughafen oder Mobilitätspunkt',quickFilters:QUICK,activeFilter:state.filter,filters:{extra:''},status:state.error?state.error:(state.loading?`Luvia sucht ${state.view?.title||'Move'} …`:`${state.results.length} passende Ergebnisse`),results});const favoritesPanel=window.LuviaPlaceCollections.favoritePanel({placeType:'mobility',items:favorites,title:'Gespeicherte Move-Punkte',empty:'Markiert einen Mobilitätspunkt mit einem Herz, um ihn hier wiederzufinden.',renderCard:entity=>savedCard(entity),open:false});r.innerHTML=window.LuviaPlaceExperience.moduleShell({destination:destination(),title:state.view?.title||'Move',description:state.view?.description||'Anreise und Mobilität vor Ort.',planned:'',discovery,collection:favoritesPanel,collectionEyebrow:'Eure Sammlung',collectionTitle:'Für eure Wege gemerkt',collectionCountLabel:`${favorites.length} Favoriten`});bind()}
function bind(){const r=state.root;r.onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);search(f.get('query'),{minRating:f.get('minRating')?Number(f.get('minRating')):null,sortBy:f.get('sortBy'),openNow:f.get('openNow')==='on'})};r.onclick=async e=>{const more=e.target.closest('[data-place-more]');if(more){state.visibleCount=Math.min(state.results.length,state.visibleCount+6);render();return}const refresh=e.target.closest('[data-place-refresh]');if(refresh){search(state.query,state.options);return}const quick=e.target.closest('[data-place-query]');if(quick){state.filter=quick.dataset.placeQuery;search(quick.dataset.placeQuery,state.options);return}const open=e.target.closest('[data-place-card-open]');if(open&&!e.target.closest('[data-place-favorite-toggle]')){const [kind,id]=String(open.dataset.placeCardOpen||'').split(':');if(kind==='result'){const p=state.searchMap.get(id);if(p)detail(p)}else{const x=state.entities.find(y=>String(link(y).id)===id);if(x)detail(place(x),link(x),x)}return}};r.onpointerover=e=>{const card=e.target.closest('[data-place-card-open^="result:"]');if(card){const id=String(card.dataset.placeCardOpen||'').split(':')[1];if(id)window.LuviaPlaceDetails?.prefetch?.([id],{regionCode:'DE'})}};r.onfocusin=r.onpointerover}
async function mount(instance,context={}){state.root=instance?.roots?.[0]||document.querySelector('#mobility-module');state.trip=context.trip||instance?.trip||window.LuviaTripStore?.snapshot?.().activeTrip;state.root.className='luvia-restaurants-v2 luvia-move-module';render();await load();if(!window.LuviaDiscoveryContracts?.pendingFor?.('mobility'))await search(state.view?.query||PRESETS.local.query,{sortBy:'distance'});return instance}
function unmount(){state.root=null;state.trip=null}
function configureView(preset='local'){const next=typeof preset==='string'?PRESETS[preset]:preset;if(!next)return state.view;const changed=state.view?.key!==next.key;state.view=next;state.query=next.query;state.filter=next.query;if(changed){state.results=[];state.searchMap=new Map();state.visibleCount=6;state.error=null}return state.view}
async function openPlace(payload={}){if(!state.trip)state.trip=activeTrip();const candidates=[payload.tripPlaceId,payload.placeId,payload.providerPlaceId].filter(Boolean).map(value=>String(value).replace(/^places\//,''));const matches=entity=>{const p=place(entity),l=link(entity);return candidates.includes(String(l.id||''))||candidates.includes(String(p.id||''))||candidates.includes(providerId(p))};let entity=state.entities.find(matches);if(!entity&&tripId()){try{const response=await window.LuviaPlaceEntities?.list?.({tripId:tripId(),type:'mobility'});const fresh=(response?.data?.entities||[]).filter(item=>link(item).status!=='archived');if(fresh.length){state.entities=fresh;window.LuviaPlaceCollections?.remember?.('mobility',fresh,tripId());entity=fresh.find(matches)}}catch(error){console.warn('[Luvia Mobilität] Mobilitätspunkt für externe Detailöffnung konnte nicht nachgeladen werden.',error)}}if(entity){detail(place(entity),link(entity),entity);return true}const seed=payload.seedPlace||null,provider=String(payload.providerPlaceId||'').replace(/^places\//,'');if(seed||provider){detail(normalized({...seed,id:seed?.id||payload.placeId||provider,providerPlaceId:provider||providerId(seed),name:seed?.name||payload.title||'Move-Punkt'}));return true}return false}
window.addEventListener('luvia:open-place',e=>{if(e.detail?.type==='mobility')openPlace(e.detail)});window.addEventListener('luvia:trip-place-data-changed',()=>state.root&&render());window.addEventListener('luvia:place-collection-changed',e=>{if(state.root&&e.detail?.placeType==='mobility')load()});
window.LuviaPlaceDetail?.registerCapabilityRenderer?.('mobility',({place,context})=>guidanceFor(place,context?.entity||null));
window.LuviaMobility=Object.freeze({version:VERSION,load,search,openPlace,configureView,view:()=>state.view,searchPlans:()=>SEARCH_PLANS,renderGuidance:guidanceFor});window.LuviaModules?.register({id:MODULE_ID,order:80,group:'Move',icon:'🚉',title:'Move',description:'An- und Abreise sowie Mobilität vor Ort entdecken und merken.',selectors:['#mobility-module'],version:VERSION,mount,unmount});
})();
