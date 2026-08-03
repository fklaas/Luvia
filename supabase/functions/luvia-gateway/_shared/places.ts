const BASE='https://places.googleapis.com/v1';
const TIMEZONE_BASE='https://maps.googleapis.com/maps/api/timezone/json';
const cache=new Map<string,{expires:number,value:unknown}>();
const metrics={requests:0,successes:0,failures:0,cacheHits:0,resolutions:0,timezoneRequests:0,timezoneFailures:0,lastRequestAt:null as string|null,lastSuccessAt:null as string|null,lastError:null as unknown};
const SEARCH_FIELDS='places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.addressComponents,places.location,places.viewport,places.primaryType,places.primaryTypeDisplayName,places.types,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.regularOpeningHours,places.websiteUri,places.googleMapsUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.editorialSummary,places.photos,places.accessibilityOptions,places.businessStatus,places.servesVegetarianFood,places.servesBreakfast,places.servesLunch,places.servesDinner,places.takeout,places.delivery,places.dineIn,places.reservable';
const DETAIL_FIELDS='id,displayName,formattedAddress,shortFormattedAddress,addressComponents,location,viewport,primaryType,primaryTypeDisplayName,types,rating,userRatingCount,priceLevel,currentOpeningHours,regularOpeningHours,websiteUri,googleMapsUri,nationalPhoneNumber,internationalPhoneNumber,editorialSummary,photos,reviews,accessibilityOptions,businessStatus,parkingOptions,evChargeOptions,fuelOptions,subDestinations,paymentOptions,servesVegetarianFood,servesBreakfast,servesLunch,servesDinner,servesBeer,servesWine,takeout,delivery,dineIn,reservable';

const COUNTRY_META:Record<string,{languages:string[];currency:string}>={DE:{languages:['de'],currency:'EUR'},FR:{languages:['fr'],currency:'EUR'},BE:{languages:['nl','fr','de'],currency:'EUR'},NL:{languages:['nl'],currency:'EUR'},LU:{languages:['lb','fr','de'],currency:'EUR'},AT:{languages:['de'],currency:'EUR'},CH:{languages:['de','fr','it'],currency:'CHF'},ES:{languages:['es'],currency:'EUR'},PT:{languages:['pt'],currency:'EUR'},IT:{languages:['it'],currency:'EUR'},IE:{languages:['en','ga'],currency:'EUR'},GB:{languages:['en'],currency:'GBP'},DK:{languages:['da'],currency:'DKK'},SE:{languages:['sv'],currency:'SEK'},NO:{languages:['no'],currency:'NOK'},FI:{languages:['fi','sv'],currency:'EUR'},PL:{languages:['pl'],currency:'PLN'},CZ:{languages:['cs'],currency:'CZK'},HU:{languages:['hu'],currency:'HUF'},HR:{languages:['hr'],currency:'EUR'},GR:{languages:['el'],currency:'EUR'},US:{languages:['en'],currency:'USD'},CA:{languages:['en','fr'],currency:'CAD'},JP:{languages:['ja'],currency:'JPY'},AU:{languages:['en'],currency:'AUD'}};
const flagEmoji=(code:string)=>/^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(char=>127397+char.charCodeAt(0))):'';
function viewportRadius(viewport:any,center:{lat:number;lng:number}){if(!viewport)return 20000;const toRad=(value:number)=>value*Math.PI/180;const distance=(point:{lat:number;lng:number})=>{const dLat=toRad(point.lat-center.lat),dLng=toRad(point.lng-center.lng),lat1=toRad(center.lat),lat2=toRad(point.lat);const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));};const corners=[{lat:viewport.south,lng:viewport.west},{lat:viewport.south,lng:viewport.east},{lat:viewport.north,lng:viewport.west},{lat:viewport.north,lng:viewport.east}];return Math.max(5000,Math.min(50000,Math.round(Math.max(...corners.map(distance))*1.35/1000)*1000));}

const DESTINATION_FIELDS='places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.viewport,places.primaryType,places.types';
const hash=(value:unknown)=>{const text=JSON.stringify(value);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(36)};
const getKey=()=>Deno.env.get('GOOGLE_PLACES_API_KEY')||'';

function base64Url(bytes:Uint8Array){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function createPlacesSessionToken(){const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);return base64Url(bytes);}
function normalizePlacesSessionToken(value:unknown){const token=String(value||'').trim();if(/^[A-Za-z0-9_-]{16,256}$/.test(token))return token;return createPlacesSessionToken();}

const cleanObject=(value:any):any=>{if(Array.isArray(value))return value.map(cleanObject);if(value&&typeof value==='object'){const out:any={};for(const[k,v]of Object.entries(value)){if(v!==undefined&&v!==null&&v!==''&&!(Array.isArray(v)&&!v.length))out[k]=cleanObject(v);}return out;}return value;};
function cached(key:string){const item=cache.get(key);if(!item)return null;if(item.expires<Date.now()){cache.delete(key);return null;}metrics.cacheHits++;return item.value;}
function store(key:string,value:unknown,ttlMs:number){cache.set(key,{expires:Date.now()+ttlMs,value});if(cache.size>250){const first=cache.keys().next().value;if(first)cache.delete(first);}}
async function google(path:string,init:RequestInit,fieldMask?:string){const key=getKey();if(!key)throw Object.assign(new Error('Google Places API Key ist nicht konfiguriert.'),{code:'PLACES_NOT_CONFIGURED',status:503});metrics.requests++;metrics.lastRequestAt=new Date().toISOString();const headers=new Headers(init.headers);headers.set('Content-Type','application/json');headers.set('X-Goog-Api-Key',key);if(fieldMask)headers.set('X-Goog-FieldMask',fieldMask);const response=await fetch(`${BASE}${path}`,{...init,headers});const body=await response.json().catch(()=>({}));if(!response.ok){metrics.failures++;metrics.lastError=body;const message=body?.error?.message||`Google Places Anfrage fehlgeschlagen (${response.status}).`;throw Object.assign(new Error(message),{code:'PLACES_PROVIDER_ERROR',status:response.status,provider:body});}metrics.successes++;metrics.lastSuccessAt=new Date().toISOString();return body;}
async function resolveTimezone(latitude:number,longitude:number){
  const key=getKey();
  if(!key)return{ok:false,status:'KEY_MISSING',message:'GOOGLE_PLACES_API_KEY fehlt.'};
  metrics.timezoneRequests++;
  try{
    const params=new URLSearchParams({location:`${latitude},${longitude}`,timestamp:String(Math.floor(Date.now()/1000)),key,language:'de'});
    const response=await fetch(`${TIMEZONE_BASE}?${params.toString()}`,{headers:{Accept:'application/json'}});
    const body=await response.json().catch(()=>({status:'INVALID_RESPONSE'}));
    console.log('[luvia-gateway][timezone] response',{
      httpStatus:response.status,
      ok:response.ok,
      googleStatus:body?.status||null,
      errorMessage:body?.errorMessage||body?.error_message||null,
      timeZoneId:body?.timeZoneId||null,
      timeZoneName:body?.timeZoneName||null,
      location:{latitude,longitude}
    });
    if(!response.ok||body?.status!=='OK'){
      metrics.timezoneFailures++;
      metrics.lastError={provider:'google-timezone',httpStatus:response.status,status:body?.status||'UNKNOWN_ERROR',message:body?.errorMessage||body?.error_message||'Time Zone API lieferte kein Ergebnis.'};
      return{ok:false,status:String(body?.status||`HTTP_${response.status}`),message:String(body?.errorMessage||body?.error_message||'Time Zone API lieferte kein Ergebnis.')};
    }
    return{ok:true,status:'OK',timezone:String(body.timeZoneId||''),timezoneName:String(body.timeZoneName||''),rawOffsetSeconds:Number(body.rawOffset||0),dstOffsetSeconds:Number(body.dstOffset||0)};
  }catch(error){
    metrics.timezoneFailures++;
    const message=error instanceof Error?error.message:String(error);
    metrics.lastError={provider:'google-timezone',status:'NETWORK_ERROR',message};
    return{ok:false,status:'NETWORK_ERROR',message};
  }
}
function normalizedViewport(v:any){if(!v)return null;const low=v.low||v.southwest||{};const high=v.high||v.northeast||{};const south=Number(low.latitude),west=Number(low.longitude),north=Number(high.latitude),east=Number(high.longitude);return [south,west,north,east].every(Number.isFinite)?{south,west,north,east}:null;}
function addressPart(components:any[],type:string){return components?.find(c=>Array.isArray(c.types)&&c.types.includes(type))||null;}
function normalizedPlace(p:any){const components=p.addressComponents||[];const country=addressPart(components,'country');return{id:p.id||String(p.name||'').replace(/^places\//,''),resourceName:p.name||p.id?`places/${p.id||String(p.name).replace(/^places\//,'')}`:null,name:p.displayName?.text||'',displayName:p.displayName?.text||'',languageCode:p.displayName?.languageCode||'',formattedAddress:p.formattedAddress||'',shortAddress:p.shortFormattedAddress||'',addressComponents:components,country:country?.longText||'',countryCode:String(country?.shortText||'').toUpperCase(),location:p.location||null,viewport:normalizedViewport(p.viewport),primaryType:p.primaryType||'',primaryTypeLabel:p.primaryTypeDisplayName?.text||'',types:p.types||[],rating:p.rating??null,userRatingCount:p.userRatingCount??0,priceLevel:p.priceLevel||null,businessStatus:p.businessStatus||null,openNow:p.currentOpeningHours?.openNow??null,openingHours:p.currentOpeningHours||p.regularOpeningHours||null,website:p.websiteUri||null,mapsUri:p.googleMapsUri||null,phone:p.internationalPhoneNumber||p.nationalPhoneNumber||null,photos:(p.photos||[]).map((x:any)=>({name:x.name,widthPx:x.widthPx,heightPx:x.heightPx,authorAttributions:x.authorAttributions||[]})),editorialSummary:p.editorialSummary?.text||null,reviews:p.reviews||[],accessibility:p.accessibilityOptions||null,accessibilityOptions:p.accessibilityOptions||null,parkingOptions:p.parkingOptions||null,evChargeOptions:p.evChargeOptions||null,fuelOptions:p.fuelOptions||null,subDestinations:p.subDestinations||[],features:{servesVegetarianFood:p.servesVegetarianFood??null,breakfast:p.servesBreakfast??null,lunch:p.servesLunch??null,dinner:p.servesDinner??null,beer:p.servesBeer??null,wine:p.servesWine??null,takeout:p.takeout??null,delivery:p.delivery??null,dineIn:p.dineIn??null,reservable:p.reservable??null},raw:p};}
function destinationBias(destination:any,explicit:any){if(explicit)return explicit;const l=destination?.location;if(!l)return undefined;const latitude=Number(l.latitude??l.lat),longitude=Number(l.longitude??l.lng);if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return undefined;return{circle:{center:{latitude,longitude},radius:Math.max(1000,Math.min(50000,Number(destination?.searchRadiusMeters)||20000))}};}
function destinationRestriction(destination:any,explicit:any){if(explicit)return explicit;const v=destination?.viewport;if(v&&[v.south,v.west,v.north,v.east].every((x:any)=>Number.isFinite(Number(x))))return{rectangle:{low:{latitude:Number(v.south),longitude:Number(v.west)},high:{latitude:Number(v.north),longitude:Number(v.east)}}};return undefined;}
function coordinate(value:any){const latitude=Number(value?.latitude??value?.lat),longitude=Number(value?.longitude??value?.lng);return Number.isFinite(latitude)&&Number.isFinite(longitude)?{latitude,longitude}:null;}
function distanceMeters(a:any,b:any){const x=coordinate(a),y=coordinate(b);if(!x||!y)return null;const rad=(v:number)=>v*Math.PI/180,dLat=rad(y.latitude-x.latitude),dLng=rad(y.longitude-x.longitude),lat1=rad(x.latitude),lat2=rad(y.latitude);const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;return Math.round(6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)));}
function cityCandidate(candidates:any[]){const priorities=['locality','administrative_area_level_2','administrative_area_level_1','postal_town','country'];for(const type of priorities){const hit=candidates.find((x:any)=>x.primaryType===type||x.types?.includes(type));if(hit)return hit;}return candidates.find((x:any)=>x.location)||null;}
function landmarkCandidate(candidates:any[],city:any){return candidates.find((x:any)=>x.id!==city?.id&&['tourist_attraction','point_of_interest','establishment','premise'].includes(x.primaryType))||null;}
function searchAnchor(destination:any,options:any){const landmark=options?.landmarkContext||destination?.landmarkContext;if(landmark?.center||landmark?.location)return coordinate(landmark.center||landmark.location);return coordinate(destination?.canonicalCity?.center||destination?.location||destination?.center);}
function postProcessPlaces(places:any[],destination:any,options:any){const anchor=searchAnchor(destination,options);let list=places.map(p=>({...p,distanceMeters:anchor?distanceMeters(anchor,p.location):null,distanceSource:options?.landmarkContext||destination?.landmarkContext?'landmark':'canonical-city'}));if(options?.vegetarianOnly){list=list.filter(p=>p.features?.servesVegetarianFood!==false);list.sort((a,b)=>Number(b.features?.servesVegetarianFood===true)-Number(a.features?.servesVegetarianFood===true));}if(Number(options?.minUserRatingCount)>0)list=list.filter(p=>Number(p.userRatingCount||0)>=Number(options.minUserRatingCount));if(Number(options?.maxDistanceMeters)>0)list=list.filter(p=>p.distanceMeters!=null&&p.distanceMeters<=Number(options.maxDistanceMeters));const sort=String(options?.sortBy||'relevance');if(sort==='distance')list.sort((a,b)=>(a.distanceMeters??Infinity)-(b.distanceMeters??Infinity));else if(sort==='rating')list.sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0)||(Number(b.userRatingCount)||0)-(Number(a.userRatingCount)||0));else if(sort==='reviews')list.sort((a,b)=>(Number(b.userRatingCount)||0)-(Number(a.userRatingCount)||0));return list;}
async function resolveDestination(payload:any){
  const query=String(payload?.query||'').trim();
  if(query.length<2)throw Object.assign(new Error('Reiseziel muss mindestens zwei Zeichen enthalten.'),{code:'DESTINATION_QUERY_INVALID',status:400});
  const languageCode=String(payload?.languageCode||'de');
  const regionCode=payload?.regionCode?String(payload.regionCode).toUpperCase():undefined;
  const forceRefresh=payload?.forceRefresh===true||payload?.refresh===true;
  const key=`destination.resolve:v2.12.3.1:${hash({query,languageCode,regionCode})}`;
  const hit=forceRefresh?null:cached(key);
  if(hit)return{data:hit,cache:{hit:true,key,ttlMs:7*24*60*60_000}};
  const body=cleanObject({textQuery:query,languageCode,regionCode,maxResultCount:5});
  const raw=await google('/places:searchText',{method:'POST',body:JSON.stringify(body)},DESTINATION_FIELDS);
  const candidates=raw.places||[];
  const p=cityCandidate(candidates);
  const landmark=landmarkCandidate(candidates,p);
  if(!p?.location)throw Object.assign(new Error('Reiseziel wurde nicht gefunden.'),{code:'DESTINATION_NOT_FOUND',status:404});
  const country=addressPart(p.addressComponents||[],'country');
  const locality=addressPart(p.addressComponents||[],'locality')||addressPart(p.addressComponents||[],'administrative_area_level_2');
  const name=p.displayName?.text||locality?.longText||query;
  const latitude=Number(p.location.latitude),longitude=Number(p.location.longitude);
  const timezone=await resolveTimezone(latitude,longitude);
  const countryCode=String(country?.shortText||'').toUpperCase();
  const viewport=normalizedViewport(p.viewport);
  const regional=COUNTRY_META[countryCode]||{languages:[],currency:''};
  const result={destination:{
    schemaVersion:5,id:String(p.id||'').replace(/^places\//,''),name,displayName:p.formattedAddress||name,
    country:country?.longText||'',countryCode,placeId:String(p.id||'').replace(/^places\//,''),
    center:{lat:latitude,lng:longitude},location:{latitude,longitude},viewport,
    searchRadiusMeters:viewportRadius(viewport,{lat:latitude,lng:longitude}),radiusSource:viewport?'viewport':'default',
    timezone:timezone.ok?timezone.timezone:'',timezoneName:timezone.ok?timezone.timezoneName:'',
    timezoneStatus:timezone.status,timezoneError:timezone.ok?'':timezone.message,
    languageCodes:regional.languages,currency:regional.currency,
    locale:regional.languages[0]&&countryCode?`${regional.languages[0]}-${countryCode}`:'de-DE',
    flagEmoji:flagEmoji(countryCode),provider:'google-places',source:'automatic-geocoding',
    primaryType:p.primaryType||null,canonicalCity:{name,placeId:String(p.id||'').replace(/^places\//,''),center:{lat:latitude,lng:longitude},viewport,country:country?.longText||'',countryCode},
    landmarkContext:landmark?.location?{name:landmark.displayName?.text||'',placeId:String(landmark.id||'').replace(/^places\//,''),primaryType:landmark.primaryType||'',center:{lat:Number(landmark.location.latitude),lng:Number(landmark.location.longitude)},viewport:normalizedViewport(landmark.viewport),source:'destination-resolve'}:null,
    resolvedAt:new Date().toISOString(),rawType:p.primaryType||null
  }};
  metrics.resolutions++;
  store(key,result,7*24*60*60_000);
  return{data:result,cache:{hit:false,key,ttlMs:7*24*60*60_000,forced:forceRefresh}};
}

export async function placesAction(action:string,payload:any){
if(action==='destination.resolve')return resolveDestination(payload);
const options=payload?.options||{};const languageCode=options.languageCode||payload?.languageCode||'de';const regionCode=options.regionCode||payload?.regionCode||payload?.destination?.countryCode||'DE';const ttl=['places.details','places.photo','places.autocomplete'].includes(action)?0:5*60_000;const key=`${action}:${hash(payload)}`;const hit=ttl>0?cached(key):null;if(hit)return{data:hit,cache:{hit:true,key,ttlMs:ttl}};let result:any;
if(action==='places.health'){result={status:'ok',service:'google-places-gateway',version:'4.16.0',configured:Boolean(getKey()),metrics:{...metrics},cache:{entries:cache.size}};return{data:result,cache:{hit:false,key:null,ttlMs:0}};}
if(action==='places.text-search'){const destination=payload?.destination||null;const landmark=options.landmarkContext||destination?.landmarkContext||null;const effectiveDestination=landmark?.center?{...destination,location:{latitude:Number(landmark.center.lat??landmark.center.latitude),longitude:Number(landmark.center.lng??landmark.center.longitude)},viewport:landmark.viewport||null,searchRadiusMeters:options.maxDistanceMeters||destination?.searchRadiusMeters}:destination;const restriction=options.strictDestination===false?undefined:destinationRestriction(effectiveDestination,options.locationRestriction);const bias=restriction?undefined:destinationBias(effectiveDestination,options.locationBias);let textQuery=String(payload?.query||'');const cityName=destination?.canonicalCity?.name||destination?.name;if(options.vegetarianOnly&&!/vegetar/i.test(textQuery))textQuery=`vegetarisch ${textQuery}`;if(cityName&&!restriction&&!bias)textQuery=`${textQuery} in ${cityName}`;if(landmark?.name&&!textQuery.toLowerCase().includes(String(landmark.name).toLowerCase()))textQuery=`${textQuery} nahe ${landmark.name}`;const body=cleanObject({textQuery,languageCode,regionCode,maxResultCount:options.maxResultCount||10,includedType:options.includedType||undefined,strictTypeFiltering:Boolean(options.strictTypeFiltering&&options.includedType),openNow:options.openNow||undefined,minRating:options.minRating||undefined,priceLevels:options.priceLevels||undefined,locationRestriction:restriction,locationBias:bias,rankPreference:options.rankPreference||undefined});const raw=await google('/places:searchText',{method:'POST',body:JSON.stringify(body)},SEARCH_FIELDS);const normalized=(raw.places||[]).map(normalizedPlace);result={places:postProcessPlaces(normalized,destination,options),nextPageToken:raw.nextPageToken||null,searchContext:{destination,canonicalCity:destination?.canonicalCity||null,landmarkContext:landmark,restriction:restriction||null,bias:bias||null,anchor:searchAnchor(destination,options),filters:{openNow:Boolean(options.openNow),minRating:options.minRating||null,priceLevels:options.priceLevels||[],vegetarianOnly:Boolean(options.vegetarianOnly),minUserRatingCount:options.minUserRatingCount||0,maxDistanceMeters:options.maxDistanceMeters||0},sortBy:options.sortBy||'relevance'}};}
else if(action==='places.nearby-search'){const body=cleanObject({languageCode,regionCode,maxResultCount:options.maxResultCount||10,includedTypes:options.includedTypes?.length?options.includedTypes:(options.includedType?[options.includedType]:undefined),excludedTypes:options.excludedTypes?.length?options.excludedTypes:undefined,includedPrimaryTypes:options.includedPrimaryTypes?.length?options.includedPrimaryTypes:undefined,excludedPrimaryTypes:options.excludedPrimaryTypes?.length?options.excludedPrimaryTypes:undefined,rankPreference:options.rankPreference||'POPULARITY',locationRestriction:{circle:{center:payload.location,radius:payload.radius||3000}}});const raw=await google('/places:searchNearby',{method:'POST',body:JSON.stringify(body)},SEARCH_FIELDS);const normalized=(raw.places||[]).map(normalizedPlace);result={places:postProcessPlaces(normalized,payload?.destination||{location:payload.location},options)};}
else if(action==='places.autocomplete'){const sessionToken=normalizePlacesSessionToken(options.sessionToken);const body=cleanObject({input:String(payload?.input||''),languageCode,regionCode,sessionToken,locationBias:destinationBias(payload?.destination,options.locationBias),includedPrimaryTypes:options.includedType?[options.includedType]:undefined});const raw=await google('/places:autocomplete',{method:'POST',body:JSON.stringify(body)});result={sessionToken,suggestions:(raw.suggestions||[]).map((s:any)=>({placeId:s.placePrediction?.placeId||null,text:s.placePrediction?.text?.text||s.queryPrediction?.text?.text||'',types:s.placePrediction?.types||[],distanceMeters:s.placePrediction?.distanceMeters??null,raw:s}))};}
else if(action==='places.details'){const id=encodeURIComponent(String(payload?.placeId||'').replace(/^places\//,''));const raw=await google(`/places/${id}?languageCode=${encodeURIComponent(languageCode)}&regionCode=${encodeURIComponent(regionCode)}`,{method:'GET'},DETAIL_FIELDS);result={place:normalizedPlace(raw)};}
else if(action==='places.photo'){const name=String(payload?.photoName||'');const qs=new URLSearchParams({skipHttpRedirect:'true',maxWidthPx:String(payload?.maxWidthPx||800)});if(payload?.maxHeightPx)qs.set('maxHeightPx',String(payload.maxHeightPx));const raw=await google(`/${name}/media?${qs}`,{method:'GET'});result={photoUri:raw.photoUri||null,name:raw.name||name};}
else throw Object.assign(new Error('Places-Aktion unbekannt.'),{code:'ACTION_NOT_FOUND',status:404});
if(ttl>0)store(key,result,ttl);return{data:result,cache:{hit:false,key,ttlMs:ttl}};}
export function placesDiagnostics(){return{configured:Boolean(getKey()),metrics:{...metrics},cache:{entries:cache.size}};}
