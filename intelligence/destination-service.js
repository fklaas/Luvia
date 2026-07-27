(function(){
  'use strict';
  const VERSION='2.12.3.1-destination-aware-search';
  const REGISTRY_KEY='luvia:destinations:v2.12.3.1';
  const CACHE_KEY='luvia:destination-cache:v2.12.3.1';
  const MIGRATION_KEY='luvia:destination-migration:v2.12.3.1';
  const TRIP_REGISTRY_KEY='parisTripRegistryV1';
  const IDENTITY_KEY='parisIdentityV1';
  const PLACEHOLDER=/^(destination|reiseziel|unser(?:em|e|es)?\s+reiseziel|euer(?:em|e|es)?\s+reiseziel)$/i;
  const listeners=new Set();
  const pending=new Map();
  const state={initialized:false,active:null,lastError:null,lastMigration:null,cacheHits:0,cacheMisses:0,resolutions:0,resolutionFailures:0,lastResolvedAt:null};
  const now=()=>new Date().toISOString();
  const parse=(value,fallback)=>{try{return JSON.parse(value)??fallback}catch{return fallback}};
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const clean=value=>{const text=String(value||'').trim().replace(/\s+/g,' ');return !text||PLACEHOLDER.test(text)?'':text};
  const slug=value=>clean(value).toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null};

  const COUNTRY_META=Object.freeze({
    DE:{languages:['de'],currency:'EUR'},FR:{languages:['fr'],currency:'EUR'},BE:{languages:['nl','fr','de'],currency:'EUR'},NL:{languages:['nl'],currency:'EUR'},LU:{languages:['lb','fr','de'],currency:'EUR'},AT:{languages:['de'],currency:'EUR'},CH:{languages:['de','fr','it'],currency:'CHF'},ES:{languages:['es'],currency:'EUR'},PT:{languages:['pt'],currency:'EUR'},IT:{languages:['it'],currency:'EUR'},IE:{languages:['en','ga'],currency:'EUR'},GB:{languages:['en'],currency:'GBP'},DK:{languages:['da'],currency:'DKK'},SE:{languages:['sv'],currency:'SEK'},NO:{languages:['no'],currency:'NOK'},FI:{languages:['fi','sv'],currency:'EUR'},IS:{languages:['is'],currency:'ISK'},PL:{languages:['pl'],currency:'PLN'},CZ:{languages:['cs'],currency:'CZK'},SK:{languages:['sk'],currency:'EUR'},HU:{languages:['hu'],currency:'HUF'},SI:{languages:['sl'],currency:'EUR'},HR:{languages:['hr'],currency:'EUR'},GR:{languages:['el'],currency:'EUR'},CY:{languages:['el','tr'],currency:'EUR'},MT:{languages:['mt','en'],currency:'EUR'},EE:{languages:['et'],currency:'EUR'},LV:{languages:['lv'],currency:'EUR'},LT:{languages:['lt'],currency:'EUR'},RO:{languages:['ro'],currency:'RON'},BG:{languages:['bg'],currency:'BGN'},TR:{languages:['tr'],currency:'TRY'},US:{languages:['en'],currency:'USD'},CA:{languages:['en','fr'],currency:'CAD'},MX:{languages:['es'],currency:'MXN'},BR:{languages:['pt'],currency:'BRL'},JP:{languages:['ja'],currency:'JPY'},CN:{languages:['zh'],currency:'CNY'},KR:{languages:['ko'],currency:'KRW'},AU:{languages:['en'],currency:'AUD'},NZ:{languages:['en','mi'],currency:'NZD'},AE:{languages:['ar'],currency:'AED'},MA:{languages:['ar','fr'],currency:'MAD'},EG:{languages:['ar'],currency:'EGP'},TH:{languages:['th'],currency:'THB'},ID:{languages:['id'],currency:'IDR'},IN:{languages:['hi','en'],currency:'INR'},ZA:{languages:['en'],currency:'ZAR'}
  });
  const flagEmoji=code=>/^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(char=>127397+char.charCodeAt(0))):'';
  function viewportRadius(viewport,center){
    if(!viewport||!center)return null;
    const toRad=value=>value*Math.PI/180;
    const haversine=(a,b)=>{const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng),lat1=toRad(a.lat),lat2=toRad(b.lat);const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));};
    const corners=[{lat:viewport.south,lng:viewport.west},{lat:viewport.south,lng:viewport.east},{lat:viewport.north,lng:viewport.west},{lat:viewport.north,lng:viewport.east}];
    const farthest=Math.max(...corners.map(point=>haversine(center,point)));
    return Math.max(5000,Math.min(50000,Math.round(farthest*1.35/1000)*1000));
  }
  function enrichCountry(countryCode,object={},trip={}){
    const meta=COUNTRY_META[countryCode]||{};
    const languages=object.languageCodes||object.language_codes||trip.languageCodes||meta.languages||[];
    const locale=clean(object.locale||trip.locale)||(languages[0]&&countryCode?`${languages[0]}-${countryCode}`:'de-DE');
    return {languageCodes:[...new Set((Array.isArray(languages)?languages:[languages]).map(clean).filter(Boolean))],currency:clean(object.currency||trip.currency||meta.currency),locale,flagEmoji:clean(object.flagEmoji||object.flag_emoji||trip.flagEmoji)||flagEmoji(countryCode)};
  }

  const emit=(type,detail={})=>{const event={type,at:now(),...detail};listeners.forEach(fn=>{try{fn(event)}catch{}});window.dispatchEvent(new CustomEvent('luvia:destination',{detail:event}));window.LuviaKernelEvents?.emit?.('destination.'+type,detail).catch?.(()=>{});};

  function tripRegistry(){return parse(localStorage.getItem(TRIP_REGISTRY_KEY),[])||[]}
  function identity(){return parse(localStorage.getItem(IDENTITY_KEY),{})||{}}
  function activeTrip(){
    const direct=window.LuviaTripContext?.getActiveTrip?.()||null;
    if(direct?.tripId)return direct;
    const current=identity(),list=tripRegistry();
    return list.find(item=>item?.tripId&&item.tripId===current.tripId)||current||{};
  }
  function normalizeViewport(value){
    if(!value||typeof value!=='object')return null;
    const low=value.low||value.southwest||value.southWest||value;
    const high=value.high||value.northeast||value.northEast||value;
    const south=number(low.latitude??low.lat??value.south);
    const west=number(low.longitude??low.lng??value.west);
    const north=number(high.latitude??high.lat??value.north);
    const east=number(high.longitude??high.lng??value.east);
    return [south,west,north,east].every(v=>v!==null)?{south,west,north,east}:null;
  }
  function canonical(input={}){
    const source=input?.destination_context||input?.destinationContext||input?.destination||input;
    const object=source&&typeof source==='object'?source:{};
    const trip=input?.trip||input;
    const name=clean(object.name||object.city||trip?.destinationName||(typeof trip?.destination==='string'?trip.destination:'')||trip?.city||trip?.location);
    const country=clean(object.country||trip?.country||trip?.countryName);
    const countryCode=clean(object.countryCode||object.country_code||trip?.countryCode).toUpperCase();
    const lat=number(object.center?.lat??object.center?.latitude??object.location?.lat??object.location?.latitude??object.latitude??object.lat??trip?.destinationLat??trip?.latitude);
    const lng=number(object.center?.lng??object.center?.longitude??object.location?.lng??object.location?.longitude??object.longitude??object.lng??trip?.destinationLng??trip?.longitude);
    const placeId=clean(object.placeId||object.place_id||trip?.destinationPlaceId||trip?.googlePlaceId);
    const id=clean(object.id||object.destinationId||trip?.destinationId)||slug([name,countryCode||country].filter(Boolean).join('-'));
    const center=lat!==null&&lng!==null?{lat,lng}:null;
    const viewport=normalizeViewport(object.viewport||object.bounds||trip?.destinationViewport);
    const requestedRadius=number(object.searchRadiusMeters||object.search_radius_meters||trip?.searchRadiusMeters);
    const explicitRadiusSource=clean(object.radiusSource||object.radius_source||trip?.radiusSource).toLowerCase();
    const radius=Math.max(1000,Math.min(100000,requestedRadius||viewportRadius(viewport,center)||20000));
    const regional=enrichCountry(countryCode,object,trip);
    const canonicalCitySource=object.canonicalCity||object.canonical_city||{};
    const landmarkSource=object.landmarkContext||object.landmark_context||object.landmark||{};
    const canonicalCityName=clean(canonicalCitySource.name||object.canonicalCityName||object.canonical_city_name||name);
    const canonicalCityPlaceId=clean(canonicalCitySource.placeId||canonicalCitySource.place_id||object.canonicalCityPlaceId||object.canonical_city_place_id||placeId);
    const canonicalCityLat=number(canonicalCitySource.center?.lat??canonicalCitySource.location?.latitude??object.canonicalCityLat);
    const canonicalCityLng=number(canonicalCitySource.center?.lng??canonicalCitySource.location?.longitude??object.canonicalCityLng);
    const canonicalCityCenter=canonicalCityLat!==null&&canonicalCityLng!==null?{lat:canonicalCityLat,lng:canonicalCityLng}:center;
    const landmarkName=clean(landmarkSource.name||object.landmarkName||object.landmark_name);
    const landmarkLat=number(landmarkSource.center?.lat??landmarkSource.location?.latitude??object.landmarkLat);
    const landmarkLng=number(landmarkSource.center?.lng??landmarkSource.location?.longitude??object.landmarkLng);
    const landmarkContext=landmarkName?{name:landmarkName,placeId:clean(landmarkSource.placeId||landmarkSource.place_id||object.landmarkPlaceId),primaryType:clean(landmarkSource.primaryType||landmarkSource.primary_type),center:landmarkLat!==null&&landmarkLng!==null?{lat:landmarkLat,lng:landmarkLng}:center,viewport:normalizeViewport(landmarkSource.viewport),source:clean(landmarkSource.source)||'destination-resolve'}:null;
    const normalizedName=countryCode&&new RegExp(`^${countryCode}\\s+`,'i').test(canonicalCityName)?canonicalCityName.replace(new RegExp(`^${countryCode}\\s+`,'i'),'').trim():canonicalCityName;
    const radiusSource=['viewport','manual','default'].includes(explicitRadiusSource)?explicitRadiusSource:(requestedRadius?'manual':viewport&&center?'viewport':'default');
    const resolved=Boolean(normalizedName&&(placeId||center));
    return Object.freeze({
      schemaVersion:5,id,tripId:clean(trip?.tripId),name:normalizedName,displayName:[normalizedName,country].filter(Boolean).join(', '),country,countryCode,placeId,center,
      canonicalCity:{name:normalizedName,placeId:canonicalCityPlaceId||placeId,center:canonicalCityCenter,viewport,country,countryCode},landmarkContext,primaryType:clean(object.primaryType||object.primary_type||object.rawType),
      location:center?{latitude:center.lat,longitude:center.lng}:null,viewport,searchRadiusMeters:radius,radiusSource,
      timezone:clean(object.timezone||trip?.timezone),timezoneName:clean(object.timezoneName||object.timezone_name||trip?.timezoneName),timezoneStatus:clean(object.timezoneStatus||object.timezone_status||trip?.timezoneStatus),timezoneError:clean(object.timezoneError||object.timezone_error||trip?.timezoneError),languageCodes:regional.languageCodes,currency:regional.currency,locale:regional.locale,flagEmoji:regional.flagEmoji,
      provider:clean(object.provider||trip?.destinationProvider),resolvedAt:object.resolvedAt||object.resolved_at||null,
      source:clean(object.source)||(placeId?'places':center?'coordinates':name?'trip_data':'missing'),
      isUsable:Boolean(name),isResolved:resolved,validation:validateShape({name,countryCode,center,placeId}),updatedAt:object.updatedAt||now()
    });
  }
  function mergeDestination(base,resolved){return canonical({...base,...resolved,center:resolved?.center||resolved?.location||base?.center,viewport:resolved?.viewport||base?.viewport,source:resolved?.source||resolved?.provider||base?.source});}
  function validateShape(value){
    const errors=[],warnings=[];
    if(!clean(value.name))errors.push({code:'DESTINATION_NAME_REQUIRED',field:'name',message:'Ein Reiseziel ist erforderlich.'});
    if(value.countryCode&&!/^[A-Z]{2}$/.test(value.countryCode))errors.push({code:'COUNTRY_CODE_INVALID',field:'countryCode',message:'Der Ländercode muss aus zwei Buchstaben bestehen.'});
    if(value.center&&(Math.abs(value.center.lat)>90||Math.abs(value.center.lng)>180))errors.push({code:'COORDINATES_INVALID',field:'center',message:'Die Koordinaten liegen außerhalb des gültigen Bereichs.'});
    if(clean(value.name)&&!value.center&&!value.placeId)warnings.push({code:'DESTINATION_UNRESOLVED',message:'Das Ziel ist nutzbar, aber noch nicht geografisch aufgelöst.'});
    return {valid:errors.length===0,errors,warnings};
  }
  function validate(input){const destination=canonical(input);return {...destination.validation,destination}}
  function registry(){return parse(localStorage.getItem(REGISTRY_KEY),[])||[]}
  function saveRegistry(items){localStorage.setItem(REGISTRY_KEY,JSON.stringify(items));return items}
  function register(input,options={}){
    const destination=canonical(input);if(!destination.validation.valid)throw Object.assign(new Error(destination.validation.errors[0]?.message||'Ungültiges Reiseziel.'),{code:'DESTINATION_INVALID',details:destination.validation});
    const items=registry(),key=destination.id||slug(destination.displayName),index=items.findIndex(item=>item.id===key||(destination.placeId&&item.placeId===destination.placeId));
    const record={...destination,id:key,registeredAt:index>=0?items[index].registeredAt:now(),updatedAt:now()};
    if(index>=0)items[index]=record;else items.push(record);saveRegistry(items);cacheSet(record);emit(index>=0?'updated':'registered',{destination:record,source:options.source||'public-api'});return clone(record);
  }
  function cache(){return parse(localStorage.getItem(CACHE_KEY),{})||{}}
  function cacheSet(destination){const values=cache();values[destination.id||slug(destination.displayName)]={destination,storedAt:now()};localStorage.setItem(CACHE_KEY,JSON.stringify(values));return destination}
  function cacheGet(key){const item=cache()[key];if(item){state.cacheHits++;return clone(item.destination)}state.cacheMisses++;return null}
  function resolve(input,options={}){
    const normalized=canonical(input);const key=normalized.id||slug(normalized.displayName);
    const cached=key&&cacheGet(key);if(cached&&!options.refresh)return {...cached,cache:'hit'};
    const registered=registry().find(item=>item.id===key||(normalized.placeId&&item.placeId===normalized.placeId));
    const resolved=canonical(registered?{...normalized,...registered}:normalized);if(resolved.isUsable)cacheSet(resolved);
    return {...resolved,cache:cached?'refresh':'miss'};
  }
  async function resolveLocation(input,options={}){
    const destination=canonical(input);
    if(!destination.name)throw Object.assign(new Error('Ein Reiseziel ist erforderlich.'),{code:'DESTINATION_NAME_REQUIRED'});
    if(destination.center&&destination.countryCode&&!options.refresh)return destination;
    if(!window.LuviaBackend?.request)throw Object.assign(new Error('Das sichere Backend ist nicht verfügbar.'),{code:'BACKEND_UNAVAILABLE'});
    const key=destination.id||slug(destination.displayName||destination.name);
    if(pending.has(key)&&!options.refresh)return pending.get(key);
    const task=(async()=>{
      const response=await window.LuviaBackend.request('destination.resolve',{query:destination.displayName||destination.name,languageCode:(destination.locale||'de-DE').split('-')[0],regionCode:destination.countryCode||undefined,forceRefresh:options.refresh===true});
      const data=response?.data?.destination||response?.data||null;
      if(!data?.center&&!data?.location)throw Object.assign(new Error('Das Reiseziel konnte geografisch nicht aufgelöst werden.'),{code:'DESTINATION_NOT_RESOLVED',details:data});
      const resolved=mergeDestination(destination,{...data,provider:data.provider||'google-places',source:'automatic-geocoding',resolvedAt:now()});
      const record=register(resolved,{source:'automatic-geocoding'});
      state.resolutions++;state.lastResolvedAt=now();state.lastError=null;
      persistActiveDestination(record);
      if(state.active&&(state.active.tripId===record.tripId||state.active.id===record.id))state.active=record;
      emit('resolved',{destination:record,source:'automatic-geocoding'});
      return clone(record);
    })().catch(error=>{state.resolutionFailures++;state.lastError=error?.message||String(error);emit('resolve-failed',{destination,error:{code:error?.code||'DESTINATION_RESOLVE_FAILED',message:state.lastError}});throw error;}).finally(()=>pending.delete(key));
    pending.set(key,task);return task;
  }
  async function ensureResolved(input,options={}){const destination=resolve(input,options);if(destination.center&&destination.countryCode&&!options.refresh)return destination;return resolveLocation(destination,options);}
  async function ensureActiveResolved(options={}){const active=getActive({refresh:true});if(!active?.isUsable)return active;try{return await ensureResolved(active,options)}catch{return clone(active)}}
  function persistActiveDestination(destination){
    const tripId=destination?.tripId||identity()?.tripId;if(!tripId)return false;
    const trips=tripRegistry();let changed=false;
    const next=trips.map(trip=>{if(trip?.tripId!==tripId)return trip;changed=true;return {...trip,destination:destination.name,destinationName:destination.name,destinationId:destination.id,destinationPlaceId:destination.placeId,destinationLat:destination.center?.lat??null,destinationLng:destination.center?.lng??null,destinationViewport:destination.viewport||null,country:destination.country,countryCode:destination.countryCode,timezone:destination.timezone,timezoneName:destination.timezoneName,timezoneStatus:destination.timezoneStatus,timezoneError:destination.timezoneError,languageCodes:destination.languageCodes,currency:destination.currency,locale:destination.locale,flagEmoji:destination.flagEmoji,searchRadiusMeters:destination.searchRadiusMeters,destinationProvider:destination.provider,destination_context:{...destination,validation:undefined,location:undefined}}});
    if(changed){localStorage.setItem(TRIP_REGISTRY_KEY,JSON.stringify(next));window.LuviaTripContext?.refresh?.();document.dispatchEvent(new CustomEvent('luvia:trip-context-changed',{detail:{tripId,destination:destination.name}}));}
    return changed;
  }
  function get(id){return clone(registry().find(item=>item.id===id)||cacheGet(id)||null)}
  function list(){return registry().map(clone)}
  function remove(id){const items=registry(),next=items.filter(item=>item.id!==id);if(next.length===items.length)return false;saveRegistry(next);emit('removed',{id});return true}
  function getActive(options={}){if(state.active&&!options.refresh)return clone(state.active);state.active=resolve(activeTrip(),options);return clone(state.active)}
  function refresh(){const previous=state.active?.id||state.active?.displayName;state.active=resolve(activeTrip(),{refresh:true});if(previous!==state.active.id||previous!==state.active.displayName)emit('context-changed',{destination:state.active});queueMicrotask(()=>ensureActiveResolved().catch(()=>{}));return clone(state.active)}
  function migrateTrips(){
    const trips=tripRegistry(),updated=[];let changed=0;
    const next=trips.map(trip=>{const destination=canonical(trip);if(!destination.isUsable)return trip;register(destination,{source:'trip-migration'});const existing=trip.destination_context||trip.destinationContext;if(existing?.schemaVersion===5)return trip;changed++;updated.push(trip.tripId||trip.tripName||destination.name);return {...trip,destination_context:{...destination,tripId:undefined,validation:undefined,location:undefined},destinationName:destination.name};});
    if(changed)localStorage.setItem(TRIP_REGISTRY_KEY,JSON.stringify(next));
    const result={version:VERSION,checked:trips.length,migrated:changed,trips:updated,at:now()};localStorage.setItem(MIGRATION_KEY,JSON.stringify(result));state.lastMigration=result;emit('migration-completed',result);return result;
  }
  async function loadRemoteRegistry(){
    if(!navigator.onLine||!window.LuviaData?.list)return {loaded:0,source:'local'};
    try{const result=await window.LuviaData.list('destinations',{scope:'global'});let loaded=0;(result.data||[]).forEach(row=>{try{register({id:row.id,name:row.name,country:row.country,countryCode:row.country_code,placeId:row.google_place_id,center:row.latitude!=null&&row.longitude!=null?{lat:row.latitude,lng:row.longitude}:null,viewport:row.viewport,timezone:row.timezone,timezoneName:row.timezone_name,languageCodes:row.language_codes,currency:row.currency,locale:row.locale,flagEmoji:row.flag_emoji,searchRadiusMeters:row.search_radius_meters,provider:row.provider,source:'database'},{source:'database'});loaded++}catch{}});return{loaded,source:result.source||'supabase'}}catch(error){state.lastError=error.message;return{loaded:0,source:'local',warning:error.message}}
  }
  async function init(){if(state.initialized)return snapshot();migrateTrips();await loadRemoteRegistry();state.active=resolve(activeTrip());state.initialized=true;emit('ready',{destination:state.active});queueMicrotask(()=>ensureActiveResolved().catch(()=>{}));return snapshot()}
  function diagnostics(){const active=getActive();return{version:VERSION,status:state.initialized?'ready':'created',active,registryCount:registry().length,cacheCount:Object.keys(cache()).length,cacheHits:state.cacheHits,cacheMisses:state.cacheMisses,resolutions:state.resolutions,resolutionFailures:state.resolutionFailures,lastResolvedAt:state.lastResolvedAt,pendingResolutions:pending.size,lastMigration:state.lastMigration||parse(localStorage.getItem(MIGRATION_KEY),null),lastError:state.lastError}}
  function snapshot(){return diagnostics()}
  function subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);listener({type:'snapshot',at:now(),destination:getActive()});return()=>listeners.delete(listener)}
  const api=Object.freeze({version:VERSION,init,normalize:canonical,validate,resolve,resolveLocation,ensureResolved,ensureActiveResolved,register,get,list,remove,getActive,refresh,migrateTrips,loadRemoteRegistry,persistActiveDestination,diagnostics,snapshot,subscribe,clean,slug});
  window.LuviaDestination=api;
  window.LuviaDestinationContext=Object.freeze({version:VERSION,normalize:canonical,getActive,refresh,validate,resolveLocation,ensureResolved,ensureActiveResolved,subscribe,clean});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(error=>{state.lastError=error.message;}),{once:true});else init().catch(error=>{state.lastError=error.message;});
})();
