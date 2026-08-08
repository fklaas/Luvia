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
    const {data:cap,error:capError}=await admin.from('booking_provider_capabilities').select('*').eq('provider_id','zenchef').maybeSingle();
    if(capError)throw capError;
    if(!cap)return json({error:'ZENCHEF_CAPABILITY_MISSING'},500);
    const body=await req.json().catch(()=>({}));
    const action=clean(body?.action).toLowerCase();
    // Exact Zenchef credential/header contract is intentionally not guessed. It is supplied
    // through partner documentation after access is granted.
    const credentialsConfigured=Boolean(Deno.env.get('ZENCHEF_API_CREDENTIALS'));
    const partnerContractConfigured=Boolean(Deno.env.get('ZENCHEF_PARTNER_CONTRACT_VERSION'));
    if(action==='diagnostics')return json({
      ok:true,provider:'zenchef',adapterVersion:'1.0.0',accessState:cap.luvia_access_state,
      bookingMode:cap.booking_mode,connected:cap.luvia_access_state==='connected',
      credentialsConfigured,partnerContractConfigured,
      capabilities:{availability:cap.supports_availability===true,createReservation:cap.supports_create_reservation===true,statusWebhook:cap.supports_status_webhook===true,statusPolling:cap.supports_status_polling===true},
      webhookConfiguration:'ZenchefOS',liveTransportEnabled:false
    });
    if(!['availability','create_reservation','update_reservation'].includes(action))return json({error:'UNSUPPORTED_ACTION'},400);
    // Expected business state is HTTP 200, so the browser does not report a false-red transport error.
    if(cap.luvia_access_state!=='connected')return json({ok:false,expected:true,error:'PARTNER_REQUIRED',details:'Zenchef ist vorbereitet, aber der Luvia-Partnerzugang ist noch nicht verbunden.',provider:'zenchef',accessState:cap.luvia_access_state});
    if(!credentialsConfigured||!partnerContractConfigured)return json({ok:false,expected:true,error:'ZENCHEF_CREDENTIALS_MISSING',details:'Zenchef Partner-Credentials bzw. der verifizierte API-Vertrag sind noch nicht konfiguriert.',provider:'zenchef'});
    return json({ok:false,expected:true,error:'ZENCHEF_LIVE_TRANSPORT_NOT_ENABLED',details:'Adapter Foundation aktiv. Live-API-Transport wird erst nach verifiziertem Zenchef-Partnerzugang und exakter API-Dokumentation freigeschaltet.',provider:'zenchef'});
  }catch(error){console.error('[booking-provider-zenchef]',error);return json({error:'ZENCHEF_ADAPTER_FAILED',details:error instanceof Error?error.message:String(error)},500);}
});
