import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const headers={'Content-Type':'application/json'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const clean=(v:unknown)=>String(v??'').trim();
Deno.serve(async(req)=>{
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const expected=Deno.env.get('QUANDOO_WEBHOOK_TOKEN');
    if(!expected)return json({error:'QUANDOO_WEBHOOK_NOT_CONFIGURED'},503);
    const supplied=req.headers.get('X-Luvia-Quandoo-Token')||'';
    if(supplied!==expected)return json({error:'INVALID_WEBHOOK_TOKEN'},401);
    const body=await req.json().catch(()=>null);
    if(!body||typeof body!=='object')return json({error:'INVALID_JSON'},400);
    const notificationType=clean((body as any).notificationType).toUpperCase();
    const reservationReference=clean((body as any)?.reservation?.id || (body as any)?.reservationEnquiry?.id);
    if(!notificationType||!reservationReference)return json({error:'INVALID_QUANDOO_NOTIFICATION'},400);
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; const url=Deno.env.get('SUPABASE_URL')!;
    const admin=createClient(url,service,{auth:{persistSession:false}});
    const verifiedNotifications=new Set(['RESERVATION_CREATED','RESERVATION_CONFIRMED','RESERVATION_REJECTED','RESERVATION_EDITED','RESERVATION_CUSTOMER_CANCELED','RESERVATION_MERCHANT_CANCELED','RESERVATION_NOTIFICATION_REQUESTED','RESERVATION_NOTIFIED','RESERVATION_RECONFIRMED','RESERVATION_CHECKED_OUT','RESERVATION_ENQUIRY_CREATED','RESERVATION_ENQUIRY_CONFIRMED','RESERVATION_ENQUIRY_REJECTED']);
    const contractKnown=verifiedNotifications.has(notificationType);
    const externalEventId=`${notificationType}:${reservationReference}:${clean((body as any)?.merchant?.id)}`;
    const {data,error}=await admin.rpc('luvia_booking_ingest_provider_status_receipt',{
      p_provider_id:'quandoo',p_transport:'webhook',p_provider_reference:reservationReference,p_provider_status:notificationType,p_external_event_id:externalEventId,
      p_correlation_token:null,p_booking_id:null,p_signature_verified:true,p_raw_payload:body,p_evidence:{source:'quandoo_webhook',contractVersion:'quandoo-public-webhooks-2026-08',contractKnown,merchantId:(body as any)?.merchant?.id??null,customerId:(body as any)?.customer?.id??null},p_occurred_at:null
    });
    if(error)throw error;
    return json({ok:true,received:true,contractKnown,contractVersion:'quandoo-public-webhooks-2026-08',result:data},200);
  }catch(error){console.error('[booking-provider-quandoo-webhook]',error);return json({error:'QUANDOO_WEBHOOK_FAILED',details:error instanceof Error?error.message:String(error)},500);}
});
