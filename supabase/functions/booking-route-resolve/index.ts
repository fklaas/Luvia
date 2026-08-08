import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERSION='2.2.0';
const corsHeaders={
  'Access-Control-Allow-Origin':'https://myluvia.app',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Vary':'Origin'
};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'content-type':'application/json; charset=utf-8'}});
const clean=(v:unknown)=>String(v??'').trim();
const emailRx=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const validEmail=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const blockedEmail=(v:string)=>/(no-?reply|noreply|example\.|wixpress|sentry|cloudflare)/i.test(v);
const isReservationEmail=(v:string)=>/(reserv|booking|table|restaurant)/i.test(v.split('@')[0]||'');
const RESERVATION_HINT=/(reserv|book(?:ing)?|table|tisch|réserv|reserve|availability|disponibilit|prenota|mesa|seat|widget)/i;
const LEGAL_HINT=/(\/|\b)(gtc|terms?|conditions?|privacy|legal|cgu|cgv|mentions[-_ ]?legales|impressum|cookies?|policy)(\/|\b|[?&#=_-])/i;
const BLOCKED_EXTERNAL=/(facebook\.com|instagram\.com|tiktok\.com|youtube\.com|google\.|maps\.|tripadvisor\.|yelp\.|linkedin\.com)/i;
const NAVIGATION_HOST=/(^|\.)(google\.[a-z.]+|maps\.apple\.com|waze\.com|mapbox\.com|bing\.com|openstreetmap\.org)$/i;
const NAVIGATION_PATH=/(\/maps?(?:\/|$)|\/directions?(?:\/|$)|\/route(?:\/|$)|\/navigation(?:\/|$)|\/itineraire(?:\/|$)|\/anfahrt(?:\/|$)|[?&](?:destination|directions?|route|navigate|navigation)=)/i;
const NAVIGATION_TEXT=/^(?:route|navigation|navigieren|anfahrt|anreise|wegbeschreibung|directions?|maps?|karte|itin[ée]raire)$/i;
const NON_BOOKING_CONTENT=/(\/virtual-menu(?:\/|$)|\/menus?(?:\/|$)|\/menu[-_]?digital|\/speisekarte(?:\/|$)|\/carte(?:\/|$)|\/gift[-_]?cards?(?:\/|$)|[?&](?:menu|carte|pdf)=)/i;
const NON_BOOKING_TEXT=/(digitale?n?\s+speisekarte|our\s+menus?|nos\s+menus?|la\s+carte|speisekarte|menu\s+pdf|download\s+menu)/i;
const BOOKING_PAGE_EVIDENCE=/(reserv(?:e|ation|ierung)|réserv(?:er|ation)|book(?:ing|\s+a\s+table)|table\s+booking|choose\s+(?:a\s+)?date|party\s+size|guests?|covers?|personen|uhrzeit|availability|disponibilit)/i;
const BROKEN_HANDOFF_HINT=/(booking|reservation|reservierung|réservation|widget|venue|restaurant)[^<\n]{0,80}(unavailable|not available|not found|disabled|closed|error|failed|temporarily unavailable|indisponible|introuvable|non disponible|nicht verfügbar|nicht verf[uü]gbar|fehlgeschlagen)|404\s*(?:not found)?|page not found|seite nicht gefunden/i;
const PROVIDERS:[RegExp,string][]=[
  [/(^|\.)opentable\./i,'opentable'],[/(^|\.)thefork\./i,'thefork'],[/(^|\.)resy\.com$/i,'resy'],[/(^|\.)sevenrooms\.com$/i,'sevenrooms'],[/(^|\.)quandoo\./i,'quandoo'],[/(^|\.)zenchef\./i,'zenchef'],
  [/(^|\.)exploretock\.com$/i,'tock'],[/(^|\.)tockhq\.com$/i,'tock'],[/(^|\.)covermanager\.com$/i,'covermanager'],[/(^|\.)resdiary\.com$/i,'resdiary'],[/(^|\.)tablecheck\.com$/i,'tablecheck'],
  [/(^|\.)formitable\.com$/i,'formitable'],[/(^|\.)aleno\.me$/i,'aleno'],[/(^|\.)simpleerb\.com$/i,'simpleerb']
];
const STOP_WORDS=new Set(['restaurant','restaurants','hotel','paris','the','and','und','chez','les','des','der','die','das','le','la','au','aux','de','du','del','di','da','el']);

type Candidate={kind:string,provider:string,contactValue:string,sourceUrl:string,isOfficial:boolean,confidence:number,evidence:Record<string,unknown>,score:number};

function safeHttpUrl(value:string){
  try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol))return null;const h=u.hostname.toLowerCase();if(h==='localhost'||h==='::1'||h.endsWith('.local')||/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h))return null;return u;}catch{return null;}
}
function providerFor(url:string){try{const h=new URL(url).hostname.toLowerCase().replace(/^www\./,'');for(const [rx,name] of PROVIDERS)if(rx.test(h))return name;return null}catch{return null}}
function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function venueTokens(name:string){return [...new Set(normalize(name).split(/\s+/).filter(v=>v.length>=4&&!STOP_WORDS.has(v)))];}
function venueMatch(name:string,url:string,text=''){
  const hay=normalize(`${url} ${text}`);const tokens=venueTokens(name);return tokens.some(token=>hay.includes(token));
}
function hasVenueIdentifier(url:string){
  try{const u=new URL(url);const q=u.search.toLowerCase();return /(^|[?&])(rid|venue|venue_id|restaurant|restaurant_id|restid|shop|location|slug|host)=/.test(`?${q.replace(/^\?/,'')}`)||/\/(explore|restaurant|restaurants|venue|venues)\//i.test(u.pathname)}catch{return false}
}
function isNonBookingContent(url:string,text=''){try{const u=new URL(url);return NON_BOOKING_CONTENT.test(`${u.pathname}${u.search}${u.hash}`)||NON_BOOKING_TEXT.test(clean(text));}catch{return true}}
function isLegalUrl(url:string){try{const u=new URL(url);return LEGAL_HINT.test(`${u.pathname}${u.search}${u.hash}`)}catch{return true}}
function isNavigationTarget(url:string,text=''){try{const u=new URL(url);const h=u.hostname.toLowerCase().replace(/^www\./,'');return NAVIGATION_HOST.test(h)||NAVIGATION_PATH.test(`${u.pathname}${u.search}${u.hash}`)||NAVIGATION_TEXT.test(clean(text));}catch{return true}}
function hasReservationIntent(url:string,text=''){return RESERVATION_HINT.test(`${url} ${text}`)}
function acceptableProviderLink(url:string,text:string,venueName:string){
  if(isLegalUrl(url)||isNavigationTarget(url,text)||isNonBookingContent(url,text))return false;
  return hasReservationIntent(url,text)||(hasVenueIdentifier(url)&&BOOKING_PAGE_EVIDENCE.test(`${url} ${text}`));
}
async function fetchPage(url:string){
  const u=safeHttpUrl(url);if(!u)return null;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3500);
  try{const res=await fetch(u.toString(),{redirect:'follow',signal:controller.signal,headers:{'user-agent':`LuviaBooking/${VERSION} (+https://myluvia.app)`,'accept':'text/html,application/xhtml+xml'}});if(!res.ok)return null;const ct=res.headers.get('content-type')||'';if(!ct.includes('text/html'))return null;return {url:res.url||u.toString(),html:(await res.text()).slice(0,1_000_000)};}catch{return null}finally{clearTimeout(timer)}
}
async function validateHandoff(url:string,venueName:string){
  const u=safeHttpUrl(url);if(!u)return {ok:false,reason:'INVALID_URL',finalUrl:url,status:0};
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),4500);
  try{
    const res=await fetch(u.toString(),{redirect:'follow',signal:controller.signal,headers:{'user-agent':`LuviaBooking/${VERSION} (+https://myluvia.app)`,'accept':'text/html,application/xhtml+xml'}});
    const finalUrl=res.url||u.toString();
    if([404,410].includes(res.status)||res.status>=500)return {ok:false,reason:`HTTP_${res.status}`,finalUrl,status:res.status};
    if(isLegalUrl(finalUrl))return {ok:false,reason:'LEGAL_REDIRECT',finalUrl,status:res.status};
    if(isNavigationTarget(finalUrl))return {ok:false,reason:'NAVIGATION_REDIRECT',finalUrl,status:res.status};
    if(isNonBookingContent(finalUrl))return {ok:false,reason:'NON_BOOKING_PROVIDER_CONTENT',finalUrl,status:res.status};
    // 401/403/429 can be bot protection while the same URL remains valid in a user's browser.
    if([401,403,429].includes(res.status))return {ok:true,reason:'BOT_PROTECTION_UNVERIFIED',finalUrl,status:res.status};
    if(!res.ok)return {ok:false,reason:`HTTP_${res.status}`,finalUrl,status:res.status};
    const ct=res.headers.get('content-type')||'';
    if(!ct.includes('text/html'))return {ok:true,reason:'REACHABLE_NON_HTML',finalUrl,status:res.status};
    const html=(await res.text()).slice(0,600_000);
    const visible=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    if(BROKEN_HANDOFF_HINT.test(visible))return {ok:false,reason:'BROKEN_WIDGET_OR_PAGE',finalUrl,status:res.status};
    if(isNonBookingContent(finalUrl,visible))return {ok:false,reason:'NON_BOOKING_PROVIDER_CONTENT',finalUrl,status:res.status};
    if(providerFor(finalUrl)&&!BOOKING_PAGE_EVIDENCE.test(`${finalUrl} ${visible}`))return {ok:false,reason:'NO_BOOKING_AFFORDANCE',finalUrl,status:res.status};
    const provider=providerFor(finalUrl);
    if(provider&&!venueMatch(venueName,finalUrl,visible)&&!hasVenueIdentifier(finalUrl)){
      return {ok:false,reason:'VENUE_MISMATCH',finalUrl,status:res.status};
    }
    return {ok:true,reason:'REACHABLE',finalUrl,status:res.status};
  }catch(error){
    // A fetch failure can be provider-side bot blocking. Keep only already venue-specific URLs.
    const venueSpecific=venueMatch(venueName,u.toString())||hasVenueIdentifier(u.toString());
    return {ok:venueSpecific,reason:venueSpecific?'FETCH_UNVERIFIED_VENUE_SPECIFIC':'FETCH_FAILED',finalUrl:u.toString(),status:0};
  }finally{clearTimeout(timer)}
}
function decodedHtml(html:string){return html.replace(/&#64;|&commat;/gi,'@').replace(/&#46;|&period;/gi,'.')}
function emailsFrom(html:string){const decoded=decodedHtml(html);const values=[...(decoded.match(emailRx)||[])];for(const m of decoded.matchAll(/mailto:([^"'?#\s>]+)/gi))values.push(decodeURIComponent(m[1]||''));return [...new Set(values.map(x=>clean(x).replace(/[),.;:]+$/,'').toLowerCase()).filter(x=>validEmail(x)&&!blockedEmail(x)))]}
function resourceLinks(base:string,html:string){
  const out:{url:string,text:string,sameOrigin:boolean,provider:string|null,tag:string}[]=[];const origin=new URL(base).origin;
  const patterns=[
    {tag:'a',rx:/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi},
    {tag:'iframe',rx:/<iframe\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi},
    {tag:'form',rx:/<form\b[^>]*action\s*=\s*["']([^"']+)["'][^>]*>/gi}
  ];
  for(const {tag,rx} of patterns){for(const m of html.matchAll(rx)){const href=clean(m[1]);if(!href||href.startsWith('mailto:')||href.startsWith('tel:')||href.startsWith('#'))continue;try{const u=new URL(href,base);if(!safeHttpUrl(u.toString()))continue;const text=tag==='a'?clean((m[2]||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' '):tag;out.push({url:u.toString(),text,sameOrigin:u.origin===origin,provider:providerFor(u.toString()),tag})}catch{}}}
  for(const m of html.matchAll(/\b(?:data-booking-url|data-reservation-url|data-widget-url|data-booking|data-reservation|data-url)\s*=\s*["']([^"']+)["']/gi)){try{const u=new URL(clean(m[1]),base);if(!safeHttpUrl(u.toString()))continue;out.push({url:u.toString(),text:'booking widget',sameOrigin:u.origin===origin,provider:providerFor(u.toString()),tag:'data'})}catch{}}
  for(const m of html.matchAll(/(?:bookingUrl|booking_url|reservationUrl|reservation_url|widgetUrl|widget_url|reserveUrl|reserve_url)\s*["']?\s*[:=]\s*["'](https?:\/\/[^"'\s<>]+)["']/gi)){try{const u=new URL(clean(m[1]).replace(/\\\//g,'/'));if(!safeHttpUrl(u.toString()))continue;const provider=providerFor(u.toString());if(!provider&&!hasReservationIntent(u.toString()))continue;out.push({url:u.toString(),text:'embedded booking config',sameOrigin:u.origin===origin,provider,tag:'config'})}catch{}}
  return out.filter((v,i,a)=>a.findIndex(x=>x.url===v.url&&x.tag===v.tag)===i);
}
function crawlLinks(base:string,html:string){return [...new Set(resourceLinks(base,html).filter(x=>x.sameOrigin&&!isLegalUrl(x.url)&&!isNavigationTarget(x.url,x.text)&&(hasReservationIntent(x.url,x.text)||/(contact|kontakt|impressum|imprint|about|nous[-_ ]contacter|contatti)/i.test(`${x.url} ${x.text}`))).map(x=>x.url))].slice(0,8)}
function detectedEngines(page:{url:string,html:string}){
  const ids=new Set<string>();
  for(const link of resourceLinks(page.url,page.html)){const p=link.provider||providerFor(link.url);if(p)ids.add(p);}
  for(const m of page.html.matchAll(/<script\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi)){try{const u=new URL(clean(m[1]),page.url);const p=providerFor(u.toString());if(p)ids.add(p)}catch{}}
  return [...ids];
}
function candidatesFromPage(page:{url:string,html:string},venueName:string){
  const out:Candidate[]=[];const baseOrigin=new URL(page.url).origin;
  for(const link of resourceLinks(page.url,page.html)){
    if(isLegalUrl(link.url)||isNavigationTarget(link.url,link.text)||isNonBookingContent(link.url,link.text))continue;
    const intent=hasReservationIntent(link.url,link.text);const venueSpecific=venueMatch(venueName,link.url,link.text)||hasVenueIdentifier(link.url);
    if(link.provider&&acceptableProviderLink(link.url,link.text,venueName)){
      const score=100+(venueSpecific?8:0)+(intent?4:0)+(link.tag==='iframe'||link.tag==='data'?2:0);
      out.push({kind:'booking_provider',provider:link.provider,contactValue:link.url,sourceUrl:page.url,isOfficial:false,confidence:Math.min(0.995,0.94+score/2000),score,evidence:{method:'official_site_provider_link',anchorText:link.text,provider:link.provider,venueSpecific,reservationIntent:intent,tag:link.tag}});continue;
    }
    if(link.sameOrigin&&intent){out.push({kind:'reservation_link',provider:'official_website',contactValue:link.url,sourceUrl:page.url,isOfficial:true,confidence:0.95,score:90+(venueSpecific?5:0),evidence:{method:'official_site_reservation_link',anchorText:link.text,venueSpecific,tag:link.tag}});continue;}
    if(!link.sameOrigin&&intent&&!BLOCKED_EXTERNAL.test(link.url)){out.push({kind:'reservation_link',provider:new URL(link.url).hostname.replace(/^www\./,''),contactValue:link.url,sourceUrl:page.url,isOfficial:false,confidence:0.91,score:82+(venueSpecific?5:0),evidence:{method:'official_site_external_booking_link',anchorText:link.text,venueSpecific,tag:link.tag}})}
  }
  return out.filter((v,i,a)=>a.findIndex(x=>x.kind===v.kind&&x.contactValue===v.contactValue)===i&&new URL(v.sourceUrl).origin===baseOrigin);
}
function bestCandidate(candidates:Candidate[]){return [...candidates].sort((a,b)=>b.score-a.score||b.confidence-a.confidence)[0]||null}
async function discoverRoute(input:{name:string,website:string,reservationUrl?:string,placeType?:string}){
  const venueName=clean(input.name);const placeType=clean(input.placeType).toLowerCase();
  if(placeType&&placeType!=='restaurant')return {resolved:false,reason:'PLACE_TYPE_NOT_SUPPORTED_YET',pages:[],candidates:[] as Candidate[],rejected:[] as {url:string,reason:string,status:number}[],enginesDetected:[] as string[]};const rejected:{url:string,reason:string,status:number}[]=[];const engines=new Set<string>();
  const existing=clean(input.reservationUrl);const direct=safeHttpUrl(existing);
  if(direct&&!isLegalUrl(direct.toString())&&!isNavigationTarget(direct.toString(),'direct reservation url')&&!isNonBookingContent(direct.toString())){
    const provider=providerFor(direct.toString());const intent=hasReservationIntent(direct.toString());
    if((provider&&acceptableProviderLink(direct.toString(),'direct reservation url',venueName))||intent){
      const health=await validateHandoff(direct.toString(),venueName);
      if(health.ok)return {resolved:true,channel:'external_link',provider:provider||'official_website',value:health.finalUrl,kind:provider?'booking_provider':'reservation_link',reason:'DIRECT_RESERVATION_URL',pages:[],candidates:[] as Candidate[],rejected,enginesDetected:provider?[provider]:[] as string[]};
      rejected.push({url:direct.toString(),reason:health.reason,status:health.status});
    }
  }
  const official=safeHttpUrl(clean(input.website));if(!official)return {resolved:false,reason:'OFFICIAL_WEBSITE_MISSING',pages:[],candidates:[] as Candidate[],rejected,enginesDetected:[] as string[]};
  const first=await fetchPage(official.toString());if(!first)return {resolved:false,reason:'OFFICIAL_WEBSITE_FETCH_FAILED',pages:[],candidates:[] as Candidate[],rejected,enginesDetected:[] as string[]};
  const pages=[first];for(const id of detectedEngines(first))engines.add(id);
  const candidates:Candidate[]=[];
  const collect=(page:{url:string,html:string})=>{candidates.push(...candidatesFromPage(page,venueName));for(const email of emailsFrom(page.html)){const kind=isReservationEmail(email)?'public_reservation_email':'public_contact_email';candidates.push({kind,provider:'official_website',contactValue:email,sourceUrl:page.url,isOfficial:true,confidence:kind==='public_reservation_email'?0.96:0.9,score:kind==='public_reservation_email'?60:50,evidence:{method:'official_site_html',page:page.url}})}};
  const tryExternal=async()=>{const uniqueNow=candidates.filter((v,i,a)=>a.findIndex(x=>x.kind===v.kind&&x.contactValue===v.contactValue)===i);const external=[...uniqueNow].filter(c=>c.kind==='booking_provider'||c.kind==='reservation_link').sort((a,b)=>b.score-a.score||b.confidence-a.confidence);for(const candidate of external){const health=await validateHandoff(candidate.contactValue,venueName);candidate.evidence={...candidate.evidence,handoffValidation:health.reason,handoffStatus:health.status,finalUrl:health.finalUrl};if(health.ok)return {candidate,health,uniqueNow};rejected.push({url:candidate.contactValue,reason:health.reason,status:health.status})}return null};
  collect(first);
  const immediate=await tryExternal();if(immediate)return {resolved:true,channel:'external_link',provider:immediate.candidate.provider,value:immediate.health.finalUrl,kind:immediate.candidate.kind,reason:'VERIFIED_BOOKING_ROUTE_FAST',pages,candidates:immediate.uniqueNow,best:immediate.candidate,rejected,enginesDetected:[...engines]};
  const crawl=crawlLinks(first.url,first.html).slice(0,6);const extra=(await Promise.all(crawl.map(link=>fetchPage(link)))).filter(Boolean) as {url:string,html:string}[];for(const page of extra){pages.push(page);for(const id of detectedEngines(page))engines.add(id);collect(page)}
  const afterCrawl=await tryExternal();if(afterCrawl)return {resolved:true,channel:'external_link',provider:afterCrawl.candidate.provider,value:afterCrawl.health.finalUrl,kind:afterCrawl.candidate.kind,reason:'VERIFIED_BOOKING_ROUTE',pages,candidates:afterCrawl.uniqueNow,best:afterCrawl.candidate,rejected,enginesDetected:[...engines]};
  const unique=candidates.filter((v,i,a)=>a.findIndex(x=>x.kind===v.kind&&x.contactValue===v.contactValue)===i);
  const emailCandidates=unique.filter(c=>c.kind==='public_reservation_email'||c.kind==='public_contact_email');
  const bestEmail=bestCandidate(emailCandidates);
  if(bestEmail)return {resolved:true,channel:'email',provider:bestEmail.provider,value:bestEmail.contactValue,kind:bestEmail.kind,reason:'VERIFIED_EMAIL_FALLBACK',pages,candidates:unique,best:bestEmail,rejected,enginesDetected:[...engines]};
  return {resolved:false,reason:rejected.length?'NO_HEALTHY_BOOKING_ROUTE':'NO_VERIFIED_ROUTE',pages,candidates:unique,rejected,enginesDetected:[...engines]};
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});
  try{
    if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
    const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!anon||!service)return json({error:'SUPABASE_ENV_MISSING'},500);
    const authorization=req.headers.get('Authorization')||'';if(!authorization)return json({error:'AUTH_REQUIRED'},401);
    const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}}});const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({}));const bookingId=clean(body.bookingId);

    // Preview mode: resolve the route before Luvia shows an e-mail fallback form.
    if(!bookingId){
      const place=body.place||{};const name=clean(place.name);const placeType=clean(place.placeType||place.type);const website=clean(place.website);const reservationUrl=clean(place.reservationUrl||place.bookingUrl);
      if(!name)return json({error:'PLACE_NAME_REQUIRED'},400);
      const discovered=await discoverRoute({name,placeType,website,reservationUrl});
      return json({ok:true,resolved:discovered.resolved,channel:(discovered as any).channel||null,provider:(discovered as any).provider||null,value:(discovered as any).value||null,kind:(discovered as any).kind||null,reason:discovered.reason,pagesChecked:discovered.pages.length,candidatesFound:discovered.candidates.length,rejectedRoutes:discovered.rejected?.length||0,enginesDetected:(discovered as any).enginesDetected||[],resolverVersion:VERSION});
    }

    const {data:booking,error}=await userClient.from('bookings').select('*').eq('id',bookingId).single();if(error||!booking)return json({error:'BOOKING_NOT_FOUND_OR_FORBIDDEN'},404);
    const existingUrl=clean(booking.contact?.bookingUrl||booking.contact?.booking_url||booking.request?.reservationUrl);
    const discovered=await discoverRoute({name:clean(booking.title),placeType:clean(booking.request?.sourcePlaceType||booking.booking_type),website:clean(booking.contact?.website||booking.request?.website||booking.metadata?.website),reservationUrl:existingUrl});
    if(!discovered.resolved&&discovered.reason==='OFFICIAL_WEBSITE_MISSING'&&clean(booking.contact?.email))return json({ok:true,resolved:true,channel:'email',provider:booking.provider||'manual',value:clean(booking.contact.email),kind:'public_contact_email',reason:'CONTACT_ALREADY_PRESENT',resolverVersion:VERSION});

    const {data:run,error:runError}=await admin.from('booking_discovery_runs').insert({booking_id:booking.id,trip_id:booking.trip_id,status:'running',resolver_version:VERSION}).select('*').single();if(runError)return json({error:'DISCOVERY_RUN_CREATE_FAILED',details:runError.message},500);
    if(!discovered.pages.length&&!discovered.candidates.length){await admin.from('booking_discovery_runs').update({status:discovered.resolved?'completed':'failed',finished_at:new Date().toISOString(),error:discovered.resolved?null:{reason:discovered.reason}}).eq('id',run.id)}
    let candidateCount=0;const seen=new Set<string>();
    const push=async(c:Candidate)=>{const key=`${c.kind}|${c.contactValue}|${c.sourceUrl}`;if(seen.has(key))return;seen.add(key);candidateCount++;const {error:candidateError}=await admin.rpc('luvia_booking_upsert_candidate',{p_booking_id:booking.id,p_discovery_run_id:run.id,p_kind:c.kind,p_provider:c.provider,p_contact_value:c.contactValue,p_source_url:c.sourceUrl,p_is_public:true,p_is_official:c.isOfficial,p_verification_status:'verified',p_confidence:c.confidence,p_evidence:{...c.evidence,venueVerified:true,score:c.score},p_metadata:{resolver:'booking-route-resolve',resolverVersion:VERSION}});if(candidateError)console.warn('candidate upsert failed',candidateError.message)};
    for(const c of discovered.candidates)await push(c);

    // Direct URL candidates may not require a website crawl; persist them explicitly.
    if(discovered.resolved&&discovered.channel==='external_link'&&discovered.value&&!discovered.candidates.some(c=>c.contactValue===discovered.value)){
      await push({kind:discovered.kind||'reservation_link',provider:discovered.provider||'official_website',contactValue:discovered.value,sourceUrl:clean(booking.contact?.website||booking.request?.website||discovered.value),isOfficial:discovered.provider==='official_website',confidence:0.99,score:110,evidence:{method:'direct_reservation_url',venueVerified:true}})
    }
    if(discovered.resolved&&discovered.channel==='email'&&discovered.value&&!discovered.candidates.some(c=>c.contactValue===discovered.value)){
      await push({kind:discovered.kind||'public_contact_email',provider:discovered.provider||'official_website',contactValue:discovered.value,sourceUrl:clean(booking.contact?.website||booking.request?.website||''),isOfficial:true,confidence:0.95,score:55,evidence:{method:'verified_email_fallback'}})
    }

    const {data:resolution,error:resolveError}=await admin.rpc('luvia_booking_resolve_channel',{p_booking_id:booking.id,p_discovery_run_id:run.id});if(resolveError)return json({error:'CHANNEL_RESOLUTION_FAILED',details:resolveError.message},500);
    return json({ok:true,...(resolution||{}),pagesChecked:discovered.pages.length,candidatesFound:candidateCount,resolverVersion:VERSION,venueVerified:true,enginesDetected:(discovered as any).enginesDetected||[]});
  }catch(error){return json({error:'BOOKING_ROUTE_RESOLVE_UNHANDLED',details:error instanceof Error?error.message:String(error)},500)}
});
