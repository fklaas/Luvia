const DEFAULT_ENDPOINTS=[
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const cache=new Map<string,{expires:number,value:any}>();
const metrics={requests:0,successes:0,failures:0,timeouts:0,lastRequestAt:null as string|null,lastSuccessAt:null as string|null,lastError:null as unknown,lastDurationMs:null as number|null};
const clean=(value:unknown)=>String(value??'').trim();
const finite=(value:unknown)=>Number.isFinite(Number(value))?Number(value):null;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

function endpoints(){
 const configured=clean(Deno.env.get('OVERPASS_API_URL'));
 return [...new Set([configured,...DEFAULT_ENDPOINTS].filter(Boolean))];
}
function center(payload:any){
 const raw=payload?.location||payload?.destination?.location||payload?.destination?.center||payload?.destination?.coordinates||{};
 const latitude=finite(raw.latitude??raw.lat),longitude=finite(raw.longitude??raw.lng);
 if(latitude===null||longitude===null)throw Object.assign(new Error('Für Fahrradrouten werden Zielkoordinaten benötigt.'),{code:'CYCLING_LOCATION_REQUIRED',status:400});
 return{latitude,longitude};
}
function hash(value:unknown){let h=2166136261;for(const c of JSON.stringify(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function cached(key:string){const found=cache.get(key);if(!found)return null;if(found.expires<Date.now()){cache.delete(key);return null}return found.value}
function store(key:string,value:any,ttl=15*60_000){cache.set(key,{expires:Date.now()+ttl,value})}

async function fetchOverpass(endpoint:string,query:string,controller:AbortController,delayMs:number){
 if(delayMs)await wait(delayMs);
 const timer=setTimeout(()=>controller.abort('provider-timeout'),7200);
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json','User-Agent':'Luvia-Travel-App/4.11.1'},body:new URLSearchParams({data:query}),signal:controller.signal});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body?.remark||`Overpass ${response.status}`);
  return{body,endpoint};
 }finally{clearTimeout(timer)}
}
async function overpass(query:string){
 const started=Date.now(),providers=endpoints(),controllers=providers.map(()=>new AbortController());
 metrics.requests++;metrics.lastRequestAt=new Date().toISOString();
 try{
  const attempts=providers.map((endpoint,index)=>fetchOverpass(endpoint,query,controllers[index],index*220));
  const result=await Promise.any(attempts);
  metrics.successes++;metrics.lastSuccessAt=new Date().toISOString();metrics.lastError=null;metrics.lastDurationMs=Date.now()-started;
  return result;
 }catch(error){
  metrics.failures++;metrics.lastDurationMs=Date.now()-started;
  const message=error instanceof Error?error.message:String(error);
  if(/abort|timeout/i.test(message))metrics.timeouts++;
  metrics.lastError=message;
  throw Object.assign(new Error('OpenStreetMap-Routendaten sind vorübergehend nicht erreichbar.'),{code:'CYCLING_PROVIDER_ERROR',status:502,cause:error});
 }finally{controllers.forEach(controller=>controller.abort('winner-selected'))}
}
function routeProfile(tags:any={}){
 const all=[tags.route,tags['mtb:type'],tags.name,tags.description,tags.surface,tags.tracktype,tags.network,tags.ref].filter(Boolean).join(' ').toLowerCase();
 if(tags.route==='mtb'||/mountain|\bmtb\b|singletrail|downhill|enduro|freeride|bikepark|trailcenter/.test(all))return'mtb';
 if(/gravel|schotter|unpaved|fine_gravel|compacted|tracktype/.test(all))return'gravel';
 if(/city|urban|stadt|metropolitan|local cycle|\blcn\b/.test(all))return'city';
 if(/family|familie|children|kinder/.test(all))return'family';
 return'touring';
}
function profileLabel(profile:string){return({mtb:'Mountainbike-Trail',gravel:'Gravel-Tour',city:'City-Radtour',family:'Familienroute',touring:'Radtour'} as Record<string,string>)[profile]||'Fahrradroute'}
function difficulty(tags:any={}){const scale=clean(tags['mtb:scale']||tags['mtb:scale:imba']);if(scale)return`S${scale.replace(/^S/i,'')}`;const profile=routeProfile(tags);return profile==='mtb'?'Vor Ort prüfen':profile==='gravel'?'Leicht bis mittel':profile==='city'||profile==='family'?'Leicht':'Leicht bis mittel'}
function parseDistance(value:unknown){const text=clean(value).replace(',','.').toLowerCase();if(!text)return null;const n=Number(text.match(/[0-9.]+/)?.[0]);if(!Number.isFinite(n))return null;if(/mi|mile/.test(text))return Math.round(n*1609.344);if(/\bm\b|meter/.test(text)&&!/km/.test(text))return Math.round(n);return Math.round(n*1000)}
function elementCenter(element:any){const c=element?.center||element?.bounds&&{lat:(element.bounds.minlat+element.bounds.maxlat)/2,lon:(element.bounds.minlon+element.bounds.maxlon)/2}||{};return{latitude:finite(c.lat),longitude:finite(c.lon)}}
function haversine(a:any,b:any){const R=6371000,toRad=(x:number)=>x*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon),x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function destinationDistance(location:any,searchCenter:any){if(location?.latitude===null||location?.longitude===null)return null;return Math.round(haversine({lat:searchCenter.latitude,lon:searchCenter.longitude},{lat:Number(location.latitude),lon:Number(location.longitude)}))}
function quality(tags:any,profile:string,osmType:string,requestedProfile:string,distanceFromCenter:number|null,radius:number){
 let score=46;
 const name=clean(tags.name||tags.ref),explicitName=Boolean(tags.name);
 if(profile===requestedProfile)score+=22;else if(requestedProfile==='all')score+=8;
 if(osmType==='relation')score+=13;
 if(explicitName)score+=10;else score-=18;
 if(tags.distance||tags.length)score+=7;
 if(tags.network||tags.ref)score+=7;
 if(tags['mtb:scale']||tags['mtb:scale:imba'])score+=10;
 if(tags.surface||tags.tracktype)score+=5;
 if(/bikepark|trailcenter|singletrail|enduro|downhill/i.test([name,tags.description].join(' ')))score+=7;
 if(distanceFromCenter!==null)score+=Math.max(-12,10-Math.round(distanceFromCenter/Math.max(10000,radius)*18));
 return clamp(Math.round(score),35,98);
}
function normalized(element:any,destinationName='',searchCenter:any=null,requestedProfile='all',radius=100000){
 const tags=element?.tags||{},profile=routeProfile(tags),location=elementCenter(element),osmType=element.type||'relation',osmId=String(element.id||''),providerPlaceId=`osm-${osmType}-${osmId}`;
 const explicitName=clean(tags.name||tags.ref),name=explicitName||`${profileLabel(profile)} ${osmId}`;
 const description=clean(tags.description||tags.note)||`${profileLabel(profile)} aus OpenStreetMap-Routendaten.`;
 const distanceMeters=parseDistance(tags.distance||tags.length),distanceFromDestinationMeters=searchCenter?destinationDistance(location,searchCenter):null;
 const qualityScore=quality(tags,profile,osmType,requestedProfile,distanceFromDestinationMeters,radius);
 return{id:providerPlaceId,providerPlaceId,provider:'openstreetmap',source:'openstreetmap',sourceId:`${osmType}/${osmId}`,name,displayName:name,formattedAddress:destinationName||'',shortAddress:destinationName||'',description,editorialSummary:description,location,primaryType:'cycling_route',primaryTypeLabel:profileLabel(profile),types:['cycling_route',profile,clean(tags.route)].filter(Boolean),mapsUri:`https://www.openstreetmap.org/${osmType}/${osmId}`,website:clean(tags.website||tags.url)||null,rating:null,userRatingCount:0,openNow:null,photos:[],matchScore:qualityScore,routeData:{osmType,osmId,profile,profileLabel:profileLabel(profile),network:clean(tags.network)||null,reference:clean(tags.ref)||null,distanceMeters,distanceFromDestinationMeters,qualityScore,difficulty:difficulty(tags),surface:clean(tags.surface)||null,trackType:clean(tags.tracktype)||null,roundTrip:/yes|roundtrip|circular/i.test(clean(tags.roundtrip||tags.circular)),operator:clean(tags.operator)||null,signedDirection:clean(tags.signed_direction)||null,source:'OpenStreetMap',attribution:'© OpenStreetMap-Mitwirkende'},raw:{type:osmType,id:element.id,tags,center:element.center||null,bounds:element.bounds||null}};
}
const GENERIC_WORDS=new Set(['fahrrad','fahrräder','route','routen','tour','touren','radtour','radtouren','radweg','radwege','trail','trails','mountainbike','mountainbiking','mtb','singletrail','singletrails','enduro','downhill','gravel','schotter','city','stadt','familie','familien','bikepark','bikeparks','entdecken','cycling','bicycle']);
function significantWords(query:string){return clean(query).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(word=>word.length>2&&!GENERIC_WORDS.has(word))}
function matchesProfile(route:any,requested:string,query:string){
 const profile=route.routeData?.profile||'',text=[route.name,route.description,profile,route.routeData?.network,route.routeData?.surface,route.routeData?.reference].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(requested&&requested!=='all'){
  if(requested==='mtb'&&profile!=='mtb')return false;
  if(requested==='gravel'&&profile!=='gravel')return false;
  if(requested==='city'&&!['city','touring'].includes(profile))return false;
  if(requested==='family'&&!['family','city','touring'].includes(profile))return false;
 }
 const words=significantWords(query);
 return !words.length||words.every(word=>text.includes(word));
}
function searchQuery(latitude:number,longitude:number,radius:number,profile:string){
 const relationFilter=profile==='mtb'?'["route"="mtb"]':profile==='gravel'?'["route"="bicycle"]':'["route"~"^(bicycle|mtb)$"]';
 const trailRadius=Math.min(radius,profile==='mtb'?90000:profile==='gravel'?70000:55000);
 const trailParts=profile==='mtb'||profile==='all'?`\n way(around:${trailRadius},${latitude},${longitude})["highway"~"^(path|track|cycleway)$"]["name"]["mtb:scale"];\n way(around:${trailRadius},${latitude},${longitude})["highway"~"^(path|track|cycleway)$"]["name"]["mtb:type"];`:'';
 const gravelParts=profile==='gravel'||profile==='all'?`\n way(around:${Math.min(radius,70000)},${latitude},${longitude})["highway"~"^(path|track|cycleway)$"]["name"]["bicycle"~"^(yes|designated)$"]["surface"~"^(gravel|fine_gravel|compacted|unpaved|ground)$"];`:'';
 return`[out:json][timeout:8];\n(\n relation(around:${radius},${latitude},${longitude})["type"="route"]${relationFilter};${trailParts}${gravelParts}\n);\nout tags center 140;`;
}
function detailsQuery(osmType:string,osmId:string){if(osmType==='way')return`[out:json][timeout:10];way(${osmId});out tags center geom;`;return`[out:json][timeout:10];relation(${osmId});out tags center;way(r);out tags center geom;`}
function geometryDetails(elements:any[]){
 const ways=elements.filter(el=>el.type==='way'&&Array.isArray(el.geometry)&&el.geometry.length>1),segments:any[]=[],surfaces=new Map<string,number>(),scales:string[]=[];let distance=0;
 for(const way of ways){const geometry=way.geometry.filter((p:any)=>finite(p.lat)!==null&&finite(p.lon)!==null).map((p:any)=>({lat:Number(p.lat),lon:Number(p.lon)}));if(geometry.length<2)continue;for(let i=1;i<geometry.length;i++)distance+=haversine(geometry[i-1],geometry[i]);segments.push(geometry);const surface=clean(way.tags?.surface||way.tags?.tracktype);if(surface)surfaces.set(surface,(surfaces.get(surface)||0)+1);const scale=clean(way.tags?.['mtb:scale']||way.tags?.['mtb:scale:imba']);if(scale)scales.push(scale)}
 const totalPoints=segments.reduce((sum,segment)=>sum+segment.length,0),step=Math.max(1,Math.ceil(totalPoints/320));let cursor=0;const simplified=segments.map(segment=>segment.filter((_:any,index:number)=>{const keep=cursor%step===0||index===segment.length-1;cursor++;return keep})).filter(segment=>segment.length>1);
 const all=simplified.flat(),first=all[0],last=all[all.length-1],loop=first&&last?haversine(first,last)<180:false;
 const surface=[...surfaces.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([name])=>name).join(', ')||null;
 const maxScale=scales.sort((a,b)=>Number.parseFloat(b)-Number.parseFloat(a))[0]||null;
 return{segments:simplified,distanceMeters:Math.round(distance)||null,surface,maxMtbScale:maxScale,roundTrip:loop};
}
function estimatedDuration(distanceMeters:number|null,profile:string){if(!distanceMeters)return null;const speed=profile==='mtb'?12:profile==='gravel'?18:profile==='city'?15:profile==='family'?12:17;return Math.max(15,Math.round(distanceMeters/1000/speed*60))}
function detailNormalized(base:any,elements:any[]){
 const relation=elements.find(el=>el.type===base.routeData.osmType&&String(el.id)===String(base.routeData.osmId))||elements.find(el=>el.tags)||{},tags={...(base.raw?.tags||{}),...(relation.tags||{})},geo=geometryDetails(elements),profile=routeProfile(tags),distanceMeters=parseDistance(tags.distance||tags.length)||geo.distanceMeters||base.routeData.distanceMeters;
 return{...base,description:clean(tags.description||base.description),routeData:{...base.routeData,profile,profileLabel:profileLabel(profile),distanceMeters,estimatedDurationMinutes:estimatedDuration(distanceMeters,profile),difficulty:geo.maxMtbScale?`S${geo.maxMtbScale.replace(/^S/i,'')}`:difficulty(tags),surface:geo.surface||clean(tags.surface)||base.routeData.surface,roundTrip:/yes|roundtrip|circular/i.test(clean(tags.roundtrip||tags.circular))||geo.roundTrip,geometrySegments:geo.segments,geometryPointCount:geo.segments.reduce((sum:number,s:any[])=>sum+s.length,0),elevationGainMeters:null,elevationSource:null,dataConfidence:geo.segments.length?'hoch':'mittel'},raw:{...base.raw,details:elements}};
}
export async function cyclingAction(action:string,payload:any){
 if(action==='cycling.health')return{data:{status:'ok',service:'cycling-routes',version:'4.11.1',configured:true,providers:{discovery:'openstreetmap-overpass',approachRouting:'google-routes-bicycle'},performance:{parallelEndpoints:true,providerTimeoutMs:7200,defaultRadiusMeters:100000,maxRadiusMeters:200000},metrics:{...metrics},cache:{entries:cache.size}}};
 if(action==='cycling.search'){
  const c=center(payload),radius=clamp(Number(payload?.radiusMeters||payload?.destination?.searchRadiusMeters||100000),10000,200000),profile=clean(payload?.profile||'all').toLowerCase(),destinationName=clean(payload?.destination?.displayName||payload?.destination?.name||''),query=clean(payload?.query),semanticQuery=significantWords(query).join(' '),key=`search:${hash([c,radius,profile,semanticQuery])}`,hit=cached(key);if(hit)return{data:hit,cache:{hit:true,key}};
  const started=Date.now();let body:any={elements:[]},endpoint:string|null=null,warning:string|null=null;
  try{const response=await overpass(searchQuery(c.latitude,c.longitude,radius,profile));body=response.body;endpoint=response.endpoint}catch(error){warning=error instanceof Error?error.message:'OSM-Routensuche vorübergehend nicht erreichbar.'}
  let routes=(body?.elements||[]).map((el:any)=>normalized(el,destinationName,c,profile,radius)).filter((route:any)=>matchesProfile(route,profile,query));
  routes.sort((a:any,b:any)=>Number(b.routeData.qualityScore||0)-Number(a.routeData.qualityScore||0)||Number(a.routeData.distanceFromDestinationMeters??Infinity)-Number(b.routeData.distanceFromDestinationMeters??Infinity)||a.name.localeCompare(b.name,'de'));
  const seenIds=new Set<string>(),seenNames=new Set<string>();routes=routes.filter((route:any)=>{const nameKey=`${route.routeData.profile}:${route.name.toLowerCase().replace(/[^a-z0-9äöüß]+/g,' ').trim()}`;if(seenIds.has(route.providerPlaceId)||seenNames.has(nameKey))return false;seenIds.add(route.providerPlaceId);if(route.name&&!/^(Mountainbike-Trail|Gravel-Tour|City-Radtour|Familienroute|Radtour) \d+$/.test(route.name))seenNames.add(nameKey);return true});
  routes=routes.slice(0,Math.max(6,Math.min(36,Number(payload?.maxResultCount||30))));
  const value={routes,provider:'openstreetmap-overpass',endpoint,warning,attribution:'© OpenStreetMap-Mitwirkende',generatedAt:new Date().toISOString(),durationMs:Date.now()-started,searchContext:{center:c,radiusMeters:radius,profile,query,semanticQuery}};store(key,value);return{data:value,cache:{hit:false,key}};
 }
 if(action==='cycling.details'){
  const providerPlace=payload?.providerPlace||{},route=providerPlace?.routeData?providerPlace:normalized({type:payload?.osmType,id:payload?.osmId,tags:payload?.tags||{},center:payload?.center||null},clean(payload?.destinationName||'')),osmType=clean(payload?.osmType||route.routeData?.osmType),osmId=clean(payload?.osmId||route.routeData?.osmId);if(!['relation','way'].includes(osmType)||!/^\d+$/.test(osmId))throw Object.assign(new Error('Ungültige OpenStreetMap-Routen-ID.'),{code:'CYCLING_ROUTE_ID_INVALID',status:400});const key=`details:${osmType}:${osmId}`,hit=cached(key);if(hit)return{data:hit,cache:{hit:true,key}};const {body,endpoint}=await overpass(detailsQuery(osmType,osmId));const value={route:detailNormalized(route,body?.elements||[]),provider:'openstreetmap-overpass',endpoint,attribution:'© OpenStreetMap-Mitwirkende',generatedAt:new Date().toISOString()};store(key,value,30*60_000);return{data:value,cache:{hit:false,key}};
 }
 throw Object.assign(new Error('Fahrradrouten-Aktion unbekannt.'),{code:'ACTION_NOT_FOUND',status:404});
}
export function cyclingDiagnostics(){return{configured:true,providers:{discovery:'openstreetmap-overpass',approachRouting:'google-routes-bicycle'},performance:{parallelEndpoints:true,providerTimeoutMs:7200,defaultRadiusMeters:100000,maxRadiusMeters:200000},metrics:{...metrics},cache:{entries:cache.size}}}
