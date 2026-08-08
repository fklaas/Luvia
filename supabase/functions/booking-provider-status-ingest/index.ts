import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const clean=(v:unknown)=>String(v??'').trim();
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')!; const anon=Deno.env.get('SUPABASE_ANON_KEY')!; const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth=req.headers.get('Authorization')||'';
    const authClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user},error}=await authClient.auth.getUser();
    if(error||!user)return json({error:'AUTH_REQUIRED'},401);
    const body=await req.json().catch(()=>({}));
    const provider=clean(body?.providerId).toLowerCase(); const transport=clean(body?.transport).toLowerCase(); const providerStatus=clean(body?.providerStatus);
    if(!provider||!providerStatus||!['api','polling'].includes(transport))return json({error:'INVALID_PROVIDER_STATUS_PAYLOAD'},400);
    const admin=createClient(url,service,{auth:{persistSession:false}});
    const {data:cap}=await admin.from('booking_provider_capabilities').select('provider_id,luvia_access_state,supports_status_polling').eq('provider_id',provider).maybeSingle();
    if(!cap)return json({error:'PROVIDER_CAPABILITY_NOT_FOUND'},404);
    if(cap.luvia_access_state!=='connected')return json({ok:false,expected:true,error:'PARTNER_REQUIRED',provider,accessState:cap.luvia_access_state});
    if(transport==='polling'&&cap.supports_status_polling!==true)return json({ok:false,expected:true,error:'STATUS_POLLING_NOT_ENABLED',provider});
    const {data:contract}=await admin.rpc('luvia_booking_resolve_provider_status_contract',{p_provider_id:provider,p_transport:transport,p_provider_status:providerStatus,p_signature_verified:true});
    const {data,error:rpcError}=await admin.rpc('luvia_booking_ingest_provider_status_receipt',{
      p_provider_id:provider,p_transport:transport,p_provider_reference:body?.providerReference??null,p_provider_status:providerStatus,p_external_event_id:body?.externalEventId??null,
      p_correlation_token:body?.correlationToken??null,p_booking_id:body?.bookingId??null,p_signature_verified:true,p_raw_payload:body?.rawPayload??body,p_evidence:{source:'booking-provider-status-ingest',actorUserId:user.id,...(body?.evidence||{})},p_occurred_at:body?.occurredAt??null
    });
    if(rpcError)throw rpcError;
    return json({ok:true,provider,transport,contract,result:data});
  }catch(error){console.error('[booking-provider-status-ingest]',error);return json({error:'PROVIDER_STATUS_INGEST_FAILED',details:error instanceof Error?error.message:String(error)},500);}
});
