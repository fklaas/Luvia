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
    const {data:cap,error:capError}=await admin.from('booking_provider_capabilities').select('*').eq('provider_id','opentable').maybeSingle();
    if(capError)throw capError;
    if(!cap)return json({error:'OPENTABLE_CAPABILITY_MISSING'},500);
    const body=await req.json().catch(()=>({}));
    const action=clean(body?.action).toLowerCase();
    const clientIdConfigured=Boolean(Deno.env.get('OPENTABLE_CLIENT_ID'));
    const clientSecretConfigured=Boolean(Deno.env.get('OPENTABLE_CLIENT_SECRET'));
    const partnerContractConfigured=Boolean(Deno.env.get('OPENTABLE_PARTNER_CONTRACT_VERSION'));
    if(action==='diagnostics')return json({
      ok:true,provider:'opentable',adapterVersion:'1.0.0',accessState:cap.luvia_access_state,
      bookingMode:cap.booking_mode,connected:cap.luvia_access_state==='connected',
      clientIdConfigured,clientSecretConfigured,partnerContractConfigured,
      capabilities:{availability:cap.supports_availability===true,createReservation:cap.supports_create_reservation===true,statusWebhook:cap.supports_status_webhook===true,statusPolling:cap.supports_status_polling===true},
      publicSurface:{directoryApi:true,consumerApiV2:true},liveTransportEnabled:false
    });
    if(!['directory_lookup','availability','create_reservation','get_reservation','cancel_reservation'].includes(action))return json({error:'UNSUPPORTED_ACTION'},400);
    // Expected business state: keep HTTP 200 so partner-required is not a false-red transport error.
    if(cap.luvia_access_state!=='connected')return json({ok:false,expected:true,error:'PARTNER_REQUIRED',details:'OpenTable ist vorbereitet, aber der Luvia-Partnerzugang ist noch nicht verbunden.',provider:'opentable',accessState:cap.luvia_access_state});
    if(!clientIdConfigured||!clientSecretConfigured||!partnerContractConfigured)return json({ok:false,expected:true,error:'OPENTABLE_CREDENTIALS_MISSING',details:'OpenTable Partner-Credentials bzw. der verifizierte API-Vertrag sind noch nicht vollständig konfiguriert.',provider:'opentable'});
    return json({ok:false,expected:true,error:'OPENTABLE_LIVE_TRANSPORT_NOT_ENABLED',details:'Adapter Foundation aktiv. Live-Transport wird erst nach verifiziertem OpenTable-Partnerzugang und abgeschlossenem Partnervertrag freigeschaltet.',provider:'opentable'});
  }catch(error){console.error('[booking-provider-opentable]',error);return json({error:'OPENTABLE_ADAPTER_FAILED',details:error instanceof Error?error.message:String(error)},500);}
});
