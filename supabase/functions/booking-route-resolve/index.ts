import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
const RESERVATION_HINT=/(reserv|book(?:ing)?|table|tisch|réserv|reserve|availability|disponibilit|prenota|mesa)/i;
const BLOCKED_EXTERNAL=/(facebook\.com|instagram\.com|tiktok\.com|youtube\.com|google\.|maps\.|tripadvisor\.|yelp\.|linkedin\.com)/i;
const PROVIDERS:[RegExp,string][]=[
  [/\bopentable\./i,'opentable'],[/\bthefork\./i,'thefork'],[/\bresy\.com$/i,'resy'],[/\bsevenrooms\.com$/i,'sevenrooms'],[/\bquandoo\./i,'quandoo'],[/\bzenchef\./i,'zenchef'],[/\bcovermanager\.com$/i,'covermanager'],[/\bresdiary\.com$/i,'resdiary'],[/\btablecheck\.com$/i,'tablecheck']
];
function safeHttpUrl(value:string){
  try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol))return null;const h=u.hostname.toLowerCase();if(h==='localhost'||h==='::1'||h.endsWith('.local')||/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h))return null;return u;}catch{return null;}
}
function providerFor(url:string){try{const h=new URL(url).hostname.toLowerCase().replace(/^www\./,'');for(const [rx,name] of PROVIDERS)if(rx.test(h))return name;return null}catch{return null}}
async function fetchPage(url:string){
  const u=safeHttpUrl(url);if(!u)return null;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
  try{const res=await fetch(u.toString(),{redirect:'follow',signal:controller.signal,headers:{'user-agent':'LuviaBooking/1.1 (+https://myluvia.app)','accept':'text/html,application/xhtml+xml'}});if(!res.ok)return null;const ct=res.headers.get('content-type')||'';if(!ct.includes('text/html'))return null;return {url:res.url||u.toString(),html:(await res.text()).slice(0,1_000_000)};}catch{return null}finally{clearTimeout(timer)}
}
function decodedHtml(html:string){return html.replace(/&#64;|&commat;/gi,'@').replace(/&#46;|&period;/gi,'.')}
function emailsFrom(html:string){const decoded=decodedHtml(html);const values=[...(decoded.match(emailRx)||[])];for(const m of decoded.matchAll(/mailto:([^"'?#\s>]+)/gi))values.push(decodeURIComponent(m[1]||''));return [...new Set(values.map(x=>clean(x).replace(/[),.;:]+$/,'').toLowerCase()).filter(x=>validEmail(x)&&!blockedEmail(x)))]}
function linksFrom(base:string,html:string){
  const out:{url:string,text:string,sameOrigin:boolean,provider:string|null}[]=[];const origin=new URL(base).origin;
  for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const href=clean(m[1]);if(!href||href.startsWith('mailto:')||href.startsWith('tel:')||href.startsWith('#'))continue;
    try{const u=new URL(href,base);if(!safeHttpUrl(u.toString()))continue;const text=clean((m[2]||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');out.push({url:u.toString(),text,sameOrigin:u.origin===origin,provider:providerFor(u.toString())})}catch{}
  }
  return out;
}
function crawlLinks(base:string,html:string){return [...new Set(linksFrom(base,html).filter(x=>x.sameOrigin&&RESERVATION_HINT.test(`${x.url} ${x.text}`)).map(x=>x.url))].slice(0,5)}
function candidatesFromPage(page:{url:string,html:string}){
  const out:{kind:string,provider:string,contactValue:string,sourceUrl:string,isOfficial:boolean,confidence:number,evidence:Record<string,unknown>}[]=[];
  const baseOrigin=new URL(page.url).origin;
  for(const link of linksFrom(page.url,page.html)){
    const hint=RESERVATION_HINT.test(`${link.url} ${link.text}`);
    if(link.provider){out.push({kind:'booking_provider',provider:link.provider,contactValue:link.url,sourceUrl:page.url,isOfficial:false,confidence:hint?0.99:0.95,evidence:{method:'official_site_link',anchorText:link.text,provider:link.provider}});continue;}
    if(link.sameOrigin&&hint){out.push({kind:'reservation_link',provider:'official_website',contactValue:link.url,sourceUrl:page.url,isOfficial:true,confidence:0.94,evidence:{method:'official_site_reservation_link',anchorText:link.text}});continue;}
    if(!link.sameOrigin&&hint&&!BLOCKED_EXTERNAL.test(link.url)){out.push({kind:'reservation_link',provider:new URL(link.url).hostname.replace(/^www\./,''),contactValue:link.url,sourceUrl:page.url,isOfficial:false,confidence:0.9,evidence:{method:'official_site_external_booking_link',anchorText:link.text}})}
  }
  return out.filter((v,i,a)=>a.findIndex(x=>x.kind===v.kind&&x.contactValue===v.contactValue)===i&&new URL(v.sourceUrl).origin===baseOrigin);
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});
  try{
    if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
    const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!anon||!service)return json({error:'SUPABASE_ENV_MISSING'},500);
    const authorization=req.headers.get('Authorization')||'';if(!authorization)return json({error:'AUTH_REQUIRED'},401);
    const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}}});const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({}));const bookingId=clean(body.bookingId);if(!bookingId)return json({error:'BOOKING_ID_REQUIRED'},400);
    const {data:booking,error}=await userClient.from('bookings').select('*').eq('id',bookingId).single();if(error||!booking)return json({error:'BOOKING_NOT_FOUND_OR_FORBIDDEN'},404);
    const existingUrl=clean(booking.contact?.bookingUrl||booking.contact?.booking_url||booking.request?.reservationUrl);
    if(existingUrl&&safeHttpUrl(existingUrl))return json({ok:true,resolved:true,channel:'external_link',provider:providerFor(existingUrl)||booking.provider||'official_website',value:existingUrl,kind:providerFor(existingUrl)?'booking_provider':'reservation_link',reason:'BOOKING_URL_ALREADY_PRESENT'});
    if(clean(booking.contact?.email))return json({ok:true,resolved:true,channel:'email',provider:booking.provider||'manual',value:clean(booking.contact.email),kind:'public_contact_email',reason:'CONTACT_ALREADY_PRESENT'});
    const website=clean(booking.contact?.website||booking.request?.website||booking.metadata?.website);const official=safeHttpUrl(website);if(!official)return json({ok:true,resolved:false,reason:'OFFICIAL_WEBSITE_MISSING'});
    const {data:run,error:runError}=await admin.from('booking_discovery_runs').insert({booking_id:booking.id,trip_id:booking.trip_id,status:'running',resolver_version:'1.1.0'}).select('*').single();if(runError)return json({error:'DISCOVERY_RUN_CREATE_FAILED',details:runError.message},500);
    const first=await fetchPage(official.toString());if(!first){await admin.from('booking_discovery_runs').update({status:'failed',finished_at:new Date().toISOString(),error:{reason:'OFFICIAL_WEBSITE_FETCH_FAILED'}}).eq('id',run.id);return json({ok:true,resolved:false,reason:'OFFICIAL_WEBSITE_FETCH_FAILED'});}
    const pages=[first];for(const link of crawlLinks(first.url,first.html)){const page=await fetchPage(link);if(page)pages.push(page)}
    let candidateCount=0;const seen=new Set<string>();
    const push=async(c:any)=>{const key=`${c.kind}|${c.contactValue}|${c.sourceUrl}`;if(seen.has(key))return;seen.add(key);candidateCount++;const {error:candidateError}=await admin.rpc('luvia_booking_upsert_candidate',{p_booking_id:booking.id,p_discovery_run_id:run.id,p_kind:c.kind,p_provider:c.provider,p_contact_value:c.contactValue,p_source_url:c.sourceUrl,p_is_public:true,p_is_official:c.isOfficial,p_verification_status:'verified',p_confidence:c.confidence,p_evidence:c.evidence,p_metadata:{resolver:'booking-route-resolve',resolverVersion:'1.1.0'}});if(candidateError)console.warn('candidate upsert failed',candidateError.message)};
    for(const page of pages){
      for(const c of candidatesFromPage(page))await push(c);
      for(const email of emailsFrom(page.html)){const kind=isReservationEmail(email)?'public_reservation_email':'public_contact_email';await push({kind,provider:'official_website',contactValue:email,sourceUrl:page.url,isOfficial:true,confidence:kind==='public_reservation_email'?0.96:0.9,evidence:{method:'official_site_html',page:page.url}})}
    }
    const {data:resolution,error:resolveError}=await admin.rpc('luvia_booking_resolve_channel',{p_booking_id:booking.id,p_discovery_run_id:run.id});if(resolveError)return json({error:'CHANNEL_RESOLUTION_FAILED',details:resolveError.message},500);
    return json({ok:true,...(resolution||{}),website:official.toString(),pagesChecked:pages.length,candidatesFound:candidateCount,resolverVersion:'1.1.0'});
  }catch(error){return json({error:'BOOKING_ROUTE_RESOLVE_UNHANDLED',details:error instanceof Error?error.message:String(error)},500)}
});
