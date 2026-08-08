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
const isReservationEmail=(v:string)=>/(reserv|booking|table|restaurant|contact|info)/i.test(v.split('@')[0]||'');

function safeHttpUrl(value:string){
  try{
    const u=new URL(value);
    if(!['http:','https:'].includes(u.protocol))return null;
    const h=u.hostname.toLowerCase();
    if(h==='localhost'||h==='::1'||h.endsWith('.local')||/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h))return null;
    return u;
  }catch{return null;}
}
async function fetchPage(url:string){
  const u=safeHttpUrl(url); if(!u)return null;
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const res=await fetch(u.toString(),{redirect:'follow',signal:controller.signal,headers:{'user-agent':'LuviaBooking/1.0 (+https://myluvia.app)','accept':'text/html,application/xhtml+xml'}});
    if(!res.ok)return null;
    const ct=res.headers.get('content-type')||''; if(!ct.includes('text/html'))return null;
    const text=(await res.text()).slice(0,1_000_000);
    return {url:res.url||u.toString(),html:text};
  }catch{return null;}finally{clearTimeout(timer);}
}
function emailsFrom(html:string){
  const decoded=html.replace(/&#64;|&commat;/gi,'@').replace(/&#46;|&period;/gi,'.');
  const values=[...(decoded.match(emailRx)||[])];
  for(const m of decoded.matchAll(/mailto:([^"'?#\s>]+)/gi))values.push(decodeURIComponent(m[1]||''));
  return [...new Set(values.map(x=>clean(x).replace(/[),.;:]+$/,'').toLowerCase()).filter(x=>validEmail(x)&&!blockedEmail(x)))];
}
function candidateLinks(base:string,html:string){
  const out:string[]=[]; const origin=new URL(base).origin;
  for(const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)){
    const href=clean(m[1]); if(!href||href.startsWith('mailto:'))continue;
    try{const u=new URL(href,base); if(u.origin!==origin)continue; if(!/(contact|kontakt|reservation|reserv|booking|book|impressum|imprint)/i.test(u.pathname+u.search))continue; if(safeHttpUrl(u.toString()))out.push(u.toString())}catch{}
  }
  return [...new Set(out)].slice(0,4);
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});
  try{
    if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
    const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!anon||!service)return json({error:'SUPABASE_ENV_MISSING'},500);
    const authorization=req.headers.get('Authorization')||''; if(!authorization)return json({error:'AUTH_REQUIRED'},401);
    const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({})); const bookingId=clean(body.bookingId); if(!bookingId)return json({error:'BOOKING_ID_REQUIRED'},400);
    const {data:booking,error}=await userClient.from('bookings').select('*').eq('id',bookingId).single();
    if(error||!booking)return json({error:'BOOKING_NOT_FOUND_OR_FORBIDDEN'},404);
    if(clean(booking.contact?.email))return json({ok:true,resolved:true,channel:'email',value:clean(booking.contact.email),reason:'CONTACT_ALREADY_PRESENT'});
    const website=clean(booking.contact?.website||booking.request?.website||booking.metadata?.website);
    const official=safeHttpUrl(website); if(!official)return json({ok:true,resolved:false,reason:'OFFICIAL_WEBSITE_MISSING'});

    const {data:run,error:runError}=await admin.from('booking_discovery_runs').insert({booking_id:booking.id,trip_id:booking.trip_id,status:'running',resolver_version:'1.0.3'}).select('*').single();
    if(runError)return json({error:'DISCOVERY_RUN_CREATE_FAILED',details:runError.message},500);
    const first=await fetchPage(official.toString());
    if(!first){await admin.from('booking_discovery_runs').update({status:'failed',finished_at:new Date().toISOString(),error:{reason:'OFFICIAL_WEBSITE_FETCH_FAILED'}}).eq('id',run.id);return json({ok:true,resolved:false,reason:'OFFICIAL_WEBSITE_FETCH_FAILED'});}
    const pages=[first];
    for(const link of candidateLinks(first.url,first.html)){const page=await fetchPage(link);if(page)pages.push(page)}
    const seen=new Set<string>();
    for(const page of pages){
      for(const email of emailsFrom(page.html)){
        if(seen.has(email))continue; seen.add(email);
        const kind=isReservationEmail(email)?'public_reservation_email':'public_contact_email';
        const {error:candidateError}=await admin.rpc('luvia_booking_upsert_candidate',{
          p_booking_id:booking.id,p_discovery_run_id:run.id,p_kind:kind,p_provider:'official_website',p_contact_value:email,p_source_url:page.url,
          p_is_public:true,p_is_official:true,p_verification_status:'verified',p_confidence:kind==='public_reservation_email'?0.96:0.9,
          p_evidence:{method:'official_site_html',page:page.url},p_metadata:{resolver:'booking-contact-resolve',resolverVersion:'1.0.3'}
        });
        if(candidateError)console.warn('candidate upsert failed',candidateError.message);
      }
    }
    const {data:resolution,error:resolveError}=await admin.rpc('luvia_booking_resolve_channel',{p_booking_id:booking.id,p_discovery_run_id:run.id});
    if(resolveError)return json({error:'CHANNEL_RESOLUTION_FAILED',details:resolveError.message},500);
    return json({ok:true,...(resolution||{}),website:official.toString(),pagesChecked:pages.length,candidatesFound:seen.size});
  }catch(error){return json({error:'BOOKING_CONTACT_RESOLVE_UNHANDLED',details:error instanceof Error?error.message:String(error)},500);}
});
