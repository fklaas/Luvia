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
    const {data:cap,error:capError}=await admin.from('booking_provider_capabilities').select('*').eq('provider_id','tock').maybeSingle();
    if(capError)throw capError;
    if(!cap)return json({error:'TOCK_CAPABILITY_MISSING'},500);
    const body=await req.json().catch(()=>({}));
    const action=clean(body?.action).toLowerCase();
    if(action==='diagnostics')return json({
      ok:true,provider:'tock',adapterVersion:'1.0.0',accessState:cap.luvia_access_state,
      bookingMode:cap.booking_mode,connected:cap.luvia_access_state==='connected',
      capabilities:{availability:cap.supports_availability===true,createReservation:cap.supports_create_reservation===true,statusWebhook:cap.supports_status_webhook===true,statusPolling:cap.supports_status_polling===true},
      publicSurface:{reservationDataModel:true,stableReservationId:true,confirmationCode:true,partyState:true,sequenceId:true,lastUpdatedTimestamp:true,isCancelled:true,businessDomainName:true},
      publicAvailabilityCreateContractVerified:false,statusPollingContractVerified:true,statusWebhookContractVerified:false,liveTransportEnabled:false
    });
    if(!['get_reservation','poll_status'].includes(action))return json({ok:false,expected:true,error:'TOCK_ACTION_NOT_PUBLICLY_VERIFIED',details:'Für diese Tock-Aktion ist in der geprüften öffentlichen API-Dokumentation kein allgemeiner Luvia-kompatibler Vertrag verifiziert.',provider:'tock',accessState:cap.luvia_access_state});
    if(cap.luvia_access_state!=='connected')return json({ok:false,expected:true,error:'PARTNER_REQUIRED',details:'Tock ist vorbereitet, aber der Luvia-Partnerzugang ist noch nicht verbunden.',provider:'tock',accessState:cap.luvia_access_state});
    return json({ok:false,expected:true,error:'TOCK_LIVE_TRANSPORT_NOT_ENABLED',details:'Adapter Foundation aktiv. Live-Transport wird erst nach verifiziertem Tock-Zugang und dessen Auth-/Endpoint-Vertrag freigeschaltet.',provider:'tock'});
  }catch(error){console.error('[booking-provider-tock]',error);return json({error:'TOCK_ADAPTER_FAILED',details:error instanceof Error?error.message:String(error)},500);}
});
