const ROUTES_BASE='https://routes.googleapis.com/directions/v2:computeRoutes';
const cache=new Map<string,{expires:number,value:any}>();
function key(){const value=Deno.env.get('GOOGLE_MAPS_API_KEY')||Deno.env.get('GOOGLE_PLACES_API_KEY')||'';if(!value)throw Object.assign(new Error('Google Maps API Key fehlt.'),{code:'GOOGLE_MAPS_KEY_MISSING',status:503});return value;}
function point(value:any){const latitude=Number(value?.latitude??value?.lat),longitude=Number(value?.longitude??value?.lng);if(!Number.isFinite(latitude)||!Number.isFinite(longitude))throw Object.assign(new Error('Ungültige Routenkoordinaten.'),{code:'INVALID_ROUTE_COORDINATES',status:400});return{location:{latLng:{latitude,longitude}}};}
function seconds(value:any){const match=String(value||'').match(/^([0-9.]+)s$/);return match?Number(match[1]):null;}
function minutes(value:any){const s=seconds(value);return s==null?null:Math.max(1,Math.ceil(s/60));}
function normalizeStep(step:any){const transit=step?.transitDetails;return{mode:transit?'TRANSIT':String(step?.travelMode||''),distanceMeters:Number(step?.distanceMeters)||null,durationMinutes:minutes(step?.staticDuration),instruction:step?.navigationInstruction?.instructions||null,transit:transit?{stopDetails:transit.stopDetails||null,localizedValues:transit.localizedValues||null,headsign:transit.headsign||null,headway:transit.headway||null,transitLine:transit.transitLine||null,stopCount:transit.stopCount||null}:null};}
function normalize(route:any,mode:string){const legs=(route?.legs||[]).flatMap((leg:any)=>leg?.steps||[]).map(normalizeStep);const transitLegs=legs.filter((x:any)=>x.transit);const walkingMinutes=legs.filter((x:any)=>x.mode==='WALK').reduce((sum:number,x:any)=>sum+(x.durationMinutes||0),0);const transfers=Math.max(0,transitLegs.length-1);return{distanceMeters:Number(route?.distanceMeters)||null,durationSeconds:seconds(route?.duration)||seconds(route?.staticDuration),durationMinutes:minutes(route?.duration)||minutes(route?.staticDuration),polyline:route?.polyline?.encodedPolyline||null,departureTime:route?.localizedValues?.departureTime?.time?.text||route?.legs?.[0]?.steps?.find((x:any)=>x?.transitDetails)?.transitDetails?.stopDetails?.departureTime||null,arrivalTime:route?.localizedValues?.arrivalTime?.time?.text||[...route?.legs?.flatMap((l:any)=>l.steps||[])||[]].reverse().find((x:any)=>x?.transitDetails)?.transitDetails?.stopDetails?.arrivalTime||null,walkingMinutes,transfers,legs,fare:route?.travelAdvisory?.transitFare||route?.localizedValues?.transitFare||null,mode};}
async function compute(origin:any,destination:any,travelMode:'DRIVE'|'WALK'|'BICYCLE'|'TRANSIT',payload:any){
  const body:any={origin:point(origin),destination:point(destination),travelMode,languageCode:'de-DE',units:'METRIC',computeAlternativeRoutes:Boolean(payload?.computeAlternativeRoutes)};
  if(travelMode==='DRIVE')body.routingPreference='TRAFFIC_AWARE';
  if(travelMode==='TRANSIT'){
    body.departureTime=payload?.departureTime||new Date().toISOString();
    const pref=payload?.transitPreferences||{};body.transitPreferences={};
    if(pref.routingPreference&&pref.routingPreference!=='UNSPECIFIED')body.transitPreferences.routingPreference=pref.routingPreference;
    if(Array.isArray(pref.allowedTravelModes)&&pref.allowedTravelModes.length)body.transitPreferences.allowedTravelModes=pref.allowedTravelModes;
  }
  const mask='routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.travelMode,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.navigationInstruction.instructions,routes.legs.steps.transitDetails,routes.travelAdvisory.transitFare,routes.localizedValues';
  const response=await fetch(ROUTES_BASE,{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key(),'X-Goog-FieldMask':mask},body:JSON.stringify(body)});
  const raw=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(raw?.error?.message||`Routes API ${response.status}`),{code:'ROUTES_PROVIDER_ERROR',status:response.status>=500?502:400});
  return (raw?.routes||[]).map((r:any)=>normalize(r,travelMode));
}
export async function routesAction(action:string,payload:any){
  if(action!=='routes.compute')throw Object.assign(new Error('Routes-Aktion unbekannt.'),{code:'ACTION_NOT_FOUND',status:404});
  const modes=(payload?.modes||['WALK','DRIVE','BICYCLE']).filter((m:string)=>['WALK','DRIVE','BICYCLE','TRANSIT'].includes(m));
  const cacheKey=JSON.stringify([payload?.origin,payload?.destination,modes,payload?.departureTime,payload?.transitPreferences]);const found=cache.get(cacheKey);if(found&&found.expires>Date.now())return{data:found.value};
  const settled=await Promise.allSettled(modes.map((mode:string)=>compute(payload.origin,payload.destination,mode as any,payload)));
  const routes:any={};modes.forEach((mode:string,index:number)=>{const result=settled[index];routes[mode.toLowerCase()]=result.status==='fulfilled'?result.value:[]});
  const available=Object.values(routes).some((list:any)=>Array.isArray(list)&&list.length);if(!available){const rejected=settled.find(x=>x.status==='rejected') as PromiseRejectedResult|undefined;throw rejected?.reason||new Error('Route nicht verfügbar.');}
  const value={routes,provider:'google-routes',generatedAt:new Date().toISOString(),warnings:{bicycle:'Fahrradrouten können je nach Region unvollständige Radwege enthalten.'}};cache.set(cacheKey,{expires:Date.now()+180000,value});return{data:value};
}
