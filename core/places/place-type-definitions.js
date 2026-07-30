(function(){
'use strict';
const VERSION='4.9.0.1';
const REQUIRED_TYPES=Object.freeze(['restaurant','accommodation','attraction','shopping','photo_spot']);
const MAX_RECOVERY_ATTEMPTS=3;
const RETRY_DELAYS=Object.freeze([0,250,900]);
const sourceUrl=(()=>{try{return document.currentScript?.src||''}catch{return''}})();
let state={status:'booting',attempts:0,registered:0,lastError:null};
let loading=null;
let readySettled=false;
let resolveReady;
const ready=new Promise(resolve=>{resolveReady=resolve});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function snapshot(){return{version:VERSION,...state,types:window.LuviaPlaceTypeContracts?.all?.().map(item=>item.type)||[]}}
function publish(ok,error=null,{terminal=ok}={}){state={...state,status:ok?'ready':terminal?'failed':'recovering',registered:window.LuviaPlaceTypeContracts?.all?.().length||0,lastError:error?String(error.message||error):null};const result=snapshot();if((ok||terminal)&&!readySettled){readySettled=true;resolveReady(result)}window.dispatchEvent?.(new CustomEvent('luvia:place-definitions-ready',{detail:result}));return result}
function registerAll(C){
 if(!C?.register)throw new Error('Globaler Place-Type-Contract ist nicht verfügbar.');
 const common={favorite:true,gpsVisit:true,alternatives:true,recommendations:true,timeline:true,today:true,dashboard:true,travelBook:true,realtime:true,photos:true,ratings:true,notes:true};
C.register({type:'restaurant',moduleKey:'restaurants',identity:{label:'Restaurant',pluralLabel:'Restaurants',icon:'🍽️'},discovery:{title:'Worauf habt ihr Lust?',searchPlaceholder:'Restaurant, Küche oder Stimmung',categories:['Entdecken','Pasta','Vegetarisch','Café','Frühstück','Pizza','Burger','Sushi','Romantisch','Rooftop'],filters:['minRating','sortBy','openNow','priceLevel','diet']},lifecycle:['discovered','favorite','planned','reserved','visited','rated','rejected','archived'],fields:[{key:'planned_at',label:'Datum und Uhrzeit',type:'datetime',timelineRole:'point'},{key:'reservation_number',label:'Reservierungsnummer',type:'text',timelineRole:'none'},{key:'notes',label:'Notizen',type:'textarea',timelineRole:'none'}],capabilities:{...common,planning:true,reservation:true,booking:false,stay:false},ui:{card:{factSlots:['rating','distance','bestTimeToVisit','priceLevel','openingState']},detail:{providerFields:'allAvailable',sectionOrder:['gallery','header','actions','facts','providerDetails','recommendation','considerations','placeFields','alternatives','openingHours','contact'],hiddenSections:['participantMatches','nextSteps','departurePlanning','dayPlanning'],requiredSections:['alternatives']}},presentation:{hero:'Genuss, der zu eurer Reise passt',plannedTitle:'Eure Restaurantmomente',favoriteTitle:'Lieblingsorte',detailVariant:'place'}});
C.register({type:'accommodation',moduleKey:'accommodations',identity:{label:'Unterkunft',pluralLabel:'Unterkünfte',icon:'🏨'},discovery:{title:'Wo möchtet ihr wohnen?',searchPlaceholder:'Hotel, Apartment, Ferienhaus oder Stimmung',categories:['Entdecken','Hotel','Apartment','Ferienhaus','Hostel','Camping','Resort'],filters:['minRating','sortBy','openNow','accommodationType','amenities']},lifecycle:['discovered','favorite','selected','booked','checked_in','checked_out','visited','rated','rejected','archived'],fields:[{key:'check_in_at',label:'Check-in',type:'datetime',timelineRole:'start'},{key:'check_out_at',label:'Check-out',type:'datetime',timelineRole:'end'},{key:'guest_count',label:'Gäste',type:'number',timelineRole:'none'},{key:'room_count',label:'Zimmer',type:'number',timelineRole:'none'},{key:'booking_number',label:'Buchungsnummer',type:'text',timelineRole:'none'},{key:'booking_provider',label:'Buchungsanbieter',type:'text',timelineRole:'none'},{key:'is_base',label:'Fester Ausgangspunkt',type:'boolean',timelineRole:'none'},{key:'notes',label:'Notizen',type:'textarea',timelineRole:'none'}],capabilities:{...common,planning:true,reservation:false,booking:true,stay:true},ui:{card:{factSlots:['rating','distance','bestTimeToVisit','priceLevel','openingState']},detail:{providerFields:'allAvailable',sectionOrder:['gallery','header','actions','facts','providerDetails','recommendation','considerations','placeFields','alternatives','openingHours','contact'],hiddenSections:['participantMatches','nextSteps','departurePlanning','dayPlanning'],requiredSections:['alternatives']}},presentation:{hero:'Unterkünfte, die zu eurer Reise passen',plannedTitle:'Eure Aufenthalte',favoriteTitle:'Lieblingsunterkünfte',detailVariant:'place'}});
C.register({type:'attraction',moduleKey:'attractions',identity:{label:'Sehenswürdigkeit',pluralLabel:'Sehenswürdigkeiten & Aktivitäten',icon:'✨'},discovery:{title:'Was möchtet ihr erleben?',searchPlaceholder:'Sehenswürdigkeit, Museum, Park oder Aktivität',categories:['Entdecken','Sehenswürdigkeiten','Museen','Aktivitäten','Parks','Aussicht','Familie','Indoor & Outdoor'],filters:['minRating','sortBy','openNow','familyFriendly','indoorOutdoor','ticketRequired']},lifecycle:['discovered','favorite','planned','visited','rated','rejected','archived'],fields:[{key:'starts_at',label:'Datum und Uhrzeit',type:'datetime',timelineRole:'point'},{key:'duration_minutes',label:'Dauer',type:'number',timelineRole:'none'}],capabilities:{...common,planning:true,reservation:false,booking:false,stay:false},ui:{card:{factSlots:['rating','distance','bestTimeToVisit','priceLevel','openingState']},detail:{providerFields:'allAvailable',sectionOrder:['gallery','header','actions','facts','providerDetails','recommendation','considerations','placeFields','alternatives','openingHours','contact'],hiddenSections:['participantMatches','nextSteps','departurePlanning','dayPlanning'],requiredSections:['alternatives']}},presentation:{hero:'Erlebnisse, die eure Reise besonders machen',plannedTitle:'Eure Aktivitäten',favoriteTitle:'Lieblingsaktivitäten',detailVariant:'place'}});
C.register({type:'shopping',moduleKey:'shopping',identity:{label:'Shopping',pluralLabel:'Shopping',icon:'🛍️'},discovery:{title:'Was möchtet ihr entdecken?',searchPlaceholder:'Markt, Boutique, Souvenir, Feinkost oder Einkaufszentrum',categories:['Entdecken','Einkaufszentren','Märkte','Mode','Souvenirs','Feinkost','Luxus & Design','Outlet'],filters:['minRating','sortBy','openNow','shoppingType','shoppingPurpose','indoorOutdoor']},lifecycle:['discovered','favorite','planned','visited','rated','rejected','archived'],fields:[{key:'planned_at',label:'Datum und Uhrzeit',type:'datetime',timelineRole:'point'},{key:'shopping_type',label:'Einkaufsformat',type:'text',timelineRole:'none'},{key:'shopping_purpose',label:'Sortiment',type:'text',timelineRole:'none'},{key:'shopping_experience',label:'Einkaufserlebnis',type:'text',timelineRole:'none'},{key:'indoor_outdoor',label:'Indoor oder Outdoor',type:'text',timelineRole:'none'},{key:'budget_hint',label:'Preisgefühl',type:'text',timelineRole:'none'},{key:'local_character',label:'Lokaler Charakter',type:'text',timelineRole:'none'},{key:'best_visit_window',label:'Beste Besuchszeit',type:'text',timelineRole:'none'}],capabilities:{...common,planning:true,reservation:false,booking:false,stay:false,shoppingIntelligence:true,shoppingPlanning:true},ui:{card:{factSlots:['rating','distance','bestTimeToVisit','priceLevel','openingState']},detail:{providerFields:'allAvailable',sectionOrder:['gallery','header','actions','facts','providerDetails','recommendation','considerations','placeFields','shoppingGuidance','alternatives','openingHours','contact'],hiddenSections:['participantMatches','nextSteps','departurePlanning','dayPlanning'],requiredSections:['alternatives']}},presentation:{hero:'Shopping-Orte für eure Reise',plannedTitle:'Eure Shopping-Momente',favoriteTitle:'Lieblings-Shoppingorte',detailVariant:'place'}});
C.register({type:'photo_spot',moduleKey:'photo_spots',identity:{label:'Fotospot',pluralLabel:'Fotospots',icon:'📸'},discovery:{title:'Wo entstehen eure schönsten Erinnerungen?',searchPlaceholder:'Aussicht, Fotospot, Architektur oder Natur',categories:['Entdecken','Sonnenaufgang','Sonnenuntergang','Aussicht','Architektur','Natur','Romantisch','Nacht'],filters:['minRating','sortBy','openNow','lightMoment','indoorOutdoor','accessType']},lifecycle:['discovered','favorite','planned','visited','rated','rejected','archived'],fields:[{key:'planned_at',label:'Datum und Uhrzeit',type:'datetime',timelineRole:'point'},{key:'light_moment',label:'Lichtmoment',type:'text',timelineRole:'none'},{key:'best_light_window',label:'Beste Lichtzeit',type:'text',timelineRole:'none'},{key:'view_direction',label:'Blickrichtung',type:'text',timelineRole:'none'},{key:'desired_subject',label:'Gewünschtes Motiv',type:'text',timelineRole:'none'},{key:'indoor_outdoor',label:'Indoor oder Outdoor',type:'text',timelineRole:'none'},{key:'tripod_recommended',label:'Stativ sinnvoll',type:'boolean',timelineRole:'none'},{key:'access_type',label:'Zugang',type:'text',timelineRole:'none'}],capabilities:{...common,planning:true,reservation:false,booking:false,stay:false,solarIntelligence:true,photoPlanning:true},ui:{card:{factSlots:['rating','distance','bestTimeToVisit','priceLevel','openingState']},detail:{providerFields:'allAvailable',sectionOrder:['gallery','header','actions','facts','providerDetails','recommendation','considerations','placeFields','photoGuidance','alternatives','openingHours','contact'],hiddenSections:['participantMatches','nextSteps','departurePlanning','dayPlanning'],requiredSections:['alternatives']}},presentation:{hero:'Fotospots für eure gemeinsamen Erinnerungen',plannedTitle:'Eure Fotomomente',favoriteTitle:'Lieblingsfotospots',detailVariant:'place'}});
 return publish(true);
}
function recoveryUrl(attempt){
 const base=sourceUrl?new URL('place-type-contract.js',sourceUrl):new URL('core/places/place-type-contract.js',document.baseURI);
 try{const current=new URL(sourceUrl||document.baseURI);const version=current.searchParams.get('v');if(version)base.searchParams.set('v',version)}catch{}
 base.searchParams.set('recovery',String(attempt));
 base.searchParams.set('ts',String(Date.now()));
 return base.toString();
}
function loadContract(attempt){
 return new Promise((resolve,reject)=>{
  if(typeof document==='undefined'||!document.createElement){reject(new Error('Place-Type-Contract konnte nicht geladen werden.'));return}
  const script=document.createElement('script');
  let settled=false;
  const finish=(error=null)=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;script.remove?.();error?reject(error):resolve(window.LuviaPlaceTypeContracts)};
  const timer=setTimeout(()=>finish(new Error(`Place-Type-Contract Zeitüberschreitung (Versuch ${attempt}).`)),4500);
  script.src=recoveryUrl(attempt);script.async=false;script.dataset.luviaPlaceContractRecovery=String(attempt);
  script.onload=()=>window.LuviaPlaceTypeContracts?.register?finish():finish(new Error(`Place-Type-Contract blieb nach Versuch ${attempt} ohne API.`));
  script.onerror=()=>finish(new Error(`Place-Type-Contract konnte in Versuch ${attempt} nicht geladen werden.`));
  (document.head||document.documentElement).appendChild(script);
 });
}
async function recover(){
 let lastError=new Error('Globaler Place-Type-Contract ist nicht verfügbar.');
 for(let attempt=1;attempt<=MAX_RECOVERY_ATTEMPTS;attempt++){
  state={...state,status:'recovering',attempts:state.attempts+1,lastError:lastError.message};
  if(RETRY_DELAYS[attempt-1])await wait(RETRY_DELAYS[attempt-1]);
  try{const C=await loadContract(attempt);return registerAll(C)}catch(error){lastError=error;publish(false,error,{terminal:false})}
 }
 return publish(false,lastError,{terminal:true});
}
async function ensure(){
 const C=window.LuviaPlaceTypeContracts;
 if(C?.register){
  if(REQUIRED_TYPES.every(type=>C.get?.(type)))return publish(true);
  try{return registerAll(C)}catch(error){return publish(false,error,{terminal:true})}
 }
 if(loading)return loading;
 loading=recover().finally(()=>{loading=null});
 return loading;
}
window.LuviaPlaceTypeDefinitions=Object.freeze({version:VERSION,ready,ensure,diagnostics:snapshot});
ensure();
})();
