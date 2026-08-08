import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const clean=(v:unknown)=>String(v??'').trim();
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')!;
    const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth=req.headers.get('Authorization')||'';
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user)return json({error:'AUTH_REQUIRED'},401);
    const admin=createClient(url,service,{auth:{persistSession:false}});
    const {data:cap,error:capError}=await admin.from('booking_provider_capabilities').select('*').eq('provider_id','quandoo').maybeSingle();
    if(capError)throw capError;
    if(!cap)return json({error:'QUANDOO_CAPABILITY_MISSING'},500);
    const body=await req.json().catch(()=>({}));
    const action=clean(body?.action).toLowerCase();
    const credentialsConfigured=Boolean(Deno.env.get('QUANDOO_AUTH_TOKEN'));
    const agentConfigured=Boolean(Deno.env.get('QUANDOO_AGENT_ID'));
    if(action==='diagnostics')return json({ok:true,provider:'quandoo',adapterVersion:'1.0.0',accessState:cap.luvia_access_state,bookingMode:cap.booking_mode,connected:cap.luvia_access_state==='connected',credentialsConfigured,agentConfigured,apiBase:'https://api.quandoo.com/v1',attribution:'agent_id'});
    if(!['availability','create_reservation'].includes(action))return json({error:'UNSUPPORTED_ACTION'},400);
    // Expected business state: return HTTP 200 so supabase-js/browser console does not classify it as a transport failure.
    if(cap.luvia_access_state!=='connected')return json({ok:false,expected:true,error:'PARTNER_REQUIRED',details:'Quandoo ist vorbereitet, aber der Luvia-Partnerzugang ist noch nicht verbunden.',provider:'quandoo',accessState:cap.luvia_access_state});
    if(!credentialsConfigured||!agentConfigured)return json({ok:false,expected:true,error:'QUANDOO_CREDENTIALS_MISSING',details:'Quandoo Auth Token und Agent ID sind noch nicht konfiguriert.',provider:'quandoo'});
    // Foundation guard: live transport is intentionally disabled until the exact partner contract is activated.
    return json({ok:false,expected:true,error:'QUANDOO_LIVE_TRANSPORT_NOT_ENABLED',details:'Adapter Foundation aktiv. Live-API-Transport wird erst nach verifiziertem Partnerzugang freigeschaltet.',provider:'quandoo'});
  }catch(error){console.error('[booking-provider-quandoo]',error);return json({error:'QUANDOO_ADAPTER_FAILED',details:error instanceof Error?error.message:String(error)},500);}
});
