import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'npm:svix';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8'}});
const clean=(value:unknown)=>String(value??'').trim();
Deno.serve(async(req)=>{
 try{
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL'),serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),resendApiKey=Deno.env.get('RESEND_API_KEY'),webhookSecret=Deno.env.get('RESEND_WEBHOOK_SECRET');
  if(!supabaseUrl||!serviceRoleKey)return json({error:'SUPABASE_ADMIN_ENV_MISSING'},500);
  if(!resendApiKey)return json({error:'RESEND_API_KEY_MISSING'},500);
  if(!webhookSecret)return json({error:'RESEND_WEBHOOK_SECRET_MISSING'},500);
  const rawBody=await req.text(),svixId=req.headers.get('svix-id'),svixTimestamp=req.headers.get('svix-timestamp'),svixSignature=req.headers.get('svix-signature');
  if(!svixId||!svixTimestamp||!svixSignature)return json({error:'WEBHOOK_SIGNATURE_HEADERS_MISSING'},400);
  let event:any;
  try{event=new Webhook(webhookSecret).verify(rawBody,{'svix-id':svixId,'svix-timestamp':svixTimestamp,'svix-signature':svixSignature});}
  catch{return json({error:'WEBHOOK_SIGNATURE_INVALID'},400);}
  if(event?.type!=='email.received')return json({ok:true,ignored:true,type:event?.type??null});
  const emailId=clean(event?.data?.email_id);if(!emailId)return json({error:'RECEIVED_EMAIL_ID_MISSING'},400);
  const receivedResponse=await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,{headers:{Authorization:`Bearer ${resendApiKey}`,Accept:'application/json'}});
  const receivedEmail=await receivedResponse.json().catch(()=>({}));
  if(!receivedResponse.ok)return json({error:'RECEIVED_EMAIL_FETCH_FAILED',details:receivedEmail},502);
  const recipients:string[]=[...(Array.isArray(receivedEmail.to)?receivedEmail.to:[]),...(Array.isArray(receivedEmail.received_for)?receivedEmail.received_for:[]),...(Array.isArray(event?.data?.to)?event.data.to:[])].map(clean);
  const alias=recipients.find(a=>/booking-[0-9a-f-]{36}@/i.test(a));
  const match=alias?.match(/booking-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@/i);
  const bookingId=match?.[1]||null;if(!bookingId)return json({error:'BOOKING_ALIAS_NOT_FOUND',recipients},422);
  const admin=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:booking,error:bookingError}=await admin.from('bookings').select('id,status,trip_id').eq('id',bookingId).maybeSingle();
  if(bookingError)return json({error:'BOOKING_LOOKUP_FAILED',details:bookingError.message},500);if(!booking)return json({error:'BOOKING_NOT_FOUND'},404);
  const {data:existing}=await admin.from('booking_messages').select('id').eq('webhook_event_id',svixId).maybeSingle();
  if(existing)return json({ok:true,duplicate:true,bookingId,messageId:existing.id});
  const headers=receivedEmail.headers&&typeof receivedEmail.headers==='object'?receivedEmail.headers:{};
  const {data:stored,error:storeError}=await admin.from('booking_messages').insert({
    booking_id:bookingId,direction:'inbound',channel:'email',transport_provider:'resend',
    sender:clean(receivedEmail.from||event?.data?.from)||null,recipient:alias||null,intended_recipient:alias||null,actual_recipient:alias||null,
    subject:clean(receivedEmail.subject||event?.data?.subject)||null,body_text:clean(receivedEmail.text)||null,
    provider_message_id:emailId,delivery_status:'received',idempotency_key:`resend:inbound:${emailId}`,
    received_at:receivedEmail.created_at||event?.data?.created_at||event?.created_at||new Date().toISOString(),
    message_id_header:clean(receivedEmail.message_id||event?.data?.message_id||headers['message-id'])||null,
    in_reply_to:clean(headers['in-reply-to']||headers['In-Reply-To'])||null,references_header:clean(headers['references']||headers['References'])||null,
    webhook_event_id:svixId,metadata:{webhook_type:event.type,resend_email_id:emailId,matched_by:'booking_reply_alias',booking_alias:alias},raw_payload:{webhook:event,received_email:receivedEmail}
  }).select('*').single();
  if(storeError)return json({error:'INBOUND_STORE_FAILED',details:storeError.message},500);
  await admin.from('booking_events').insert({booking_id:bookingId,trip_id:booking.trip_id,event_type:'booking.message.received',payload:{message_id:stored.id,transport_provider:'resend',provider_message_id:emailId,sender:stored.sender,subject:stored.subject}});
  const {data:intel,error:intelError}=await admin.rpc('luvia_booking_process_inbound_intelligence',{p_message_id:stored.id});
  if(intelError)console.warn('BOOKING_INTELLIGENCE_WARNING',intelError);
  return json({ok:true,bookingId,messageId:stored.id,provider:'resend',direction:'inbound',intelligence:intel||null});
 }catch(error){return json({error:'BOOKING_EMAIL_INBOUND_UNHANDLED',details:error instanceof Error?error.message:String(error)},500);}
});