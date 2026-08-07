import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8'}});
const clean=(value:unknown)=>String(value??'').trim();
Deno.serve(async(req)=>{
 try{
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL'),anonKey=Deno.env.get('SUPABASE_ANON_KEY'),resendKey=Deno.env.get('RESEND_API_KEY');
  if(!supabaseUrl||!anonKey)return json({error:'SUPABASE_ENV_MISSING'},500);
  if(!resendKey)return json({error:'RESEND_API_KEY_MISSING'},500);
  const mode=clean(Deno.env.get('BOOKING_MODE')||'test').toLowerCase();
  const forcedTestRecipient=clean(Deno.env.get('BOOKING_TEST_RECIPIENT'));
  const fromDefault=clean(Deno.env.get('BOOKING_EMAIL_FROM')||'Luvia Booking <booking@booking.myluvia.app>');
  const inboundDomain=clean(Deno.env.get('BOOKING_INBOUND_DOMAIN')||'booking.myluvia.app');
  const authorization=req.headers.get('Authorization')||'';
  if(!authorization)return json({error:'AUTH_REQUIRED'},401);
  const supabase=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authorization}}});
  const body=await req.json(),bookingId=clean(body.bookingId);
  if(!bookingId)return json({error:'BOOKING_ID_REQUIRED'},400);
  const {data:booking,error:bookingError}=await supabase.from('bookings').select('*').eq('id',bookingId).single();
  if(bookingError||!booking)return json({error:'BOOKING_NOT_FOUND_OR_FORBIDDEN',details:bookingError?.message??null},404);
  const intendedRecipient=clean(booking.contact?.email);
  if(!intendedRecipient)return json({error:'BOOKING_CONTACT_EMAIL_MISSING'},400);
  const actualRecipient=mode==='production'?intendedRecipient:clean(body.testRecipient||forcedTestRecipient);
  if(!actualRecipient)return json({error:'BOOKING_TEST_RECIPIENT_MISSING'},400);
  const startDate=booking.start_at?new Date(booking.start_at):null;
  const fDate=(d:Date)=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Berlin'}).format(d);
  const fTime=(d:Date)=>new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(d);
  const requesterName=clean(body.requesterName||booking.request?.requesterName||'Luvia Reisender');
  const note=clean(body.note||booking.request?.note||booking.request?.specialRequest);
  const lines=['Guten Tag,','',booking.booking_type==='restaurant'?'ich möchte gerne einen Tisch in Ihrem Restaurant reservieren.':booking.booking_type==='hotel'?'ich möchte gerne die Verfügbarkeit für einen Aufenthalt anfragen.':'ich möchte gerne eine Buchung anfragen.','',`Datum: ${startDate?fDate(startDate):'noch offen'}`];
  if(startDate)lines.push(`Uhrzeit: ${fTime(startDate)}`);
  if(booking.booking_type==='hotel'&&booking.end_at)lines.push(`Abreise: ${fDate(new Date(booking.end_at))}`);
  lines.push(`Personen: ${booking.party_size||1}`,`Name: ${requesterName}`);
  if(note)lines.push('',`Hinweis: ${note}`);
  lines.push('','Bitte bestätigen Sie uns kurz, ob die Buchung möglich ist.','','Vielen Dank und freundliche Grüße','',requesterName,'Buchungsanfrage über Luvia');
  const subject=`Buchungsanfrage · ${booking.title}`;
  const replyAlias=inboundDomain?`booking-${booking.id}@${inboundDomain}`:null;
  const idempotencyKey=clean(body.idempotencyKey||`booking:${booking.id}:request:${booking.status}`);
  const resendBody:any={from:clean(body.sender||fromDefault),to:[actualRecipient],subject,text:lines.join('\n'),tags:[{name:'booking_id',value:booking.id}]};
  if(replyAlias)resendBody.reply_to=replyAlias;
  const resendResponse=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify(resendBody)});
  const resendPayload=await resendResponse.json().catch(()=>({}));
  if(!resendResponse.ok)return json({error:'RESEND_SEND_FAILED',details:resendPayload},502);
  const {data:storedMessage,error:messageError}=await supabase.rpc('luvia_booking_record_message',{
    p_booking_id:booking.id,p_direction:'outbound',p_channel:'email',p_transport_provider:'resend',
    p_sender:resendBody.from,p_recipient:actualRecipient,p_intended_recipient:intendedRecipient,p_actual_recipient:actualRecipient,
    p_subject:subject,p_body_text:resendBody.text,p_template_key:`${booking.booking_type}.request.de.v1`,
    p_provider_message_id:resendPayload.id,p_provider_thread_id:null,p_delivery_status:'sent',p_idempotency_key:idempotencyKey,
    p_metadata:{mode,redirected:actualRecipient.toLowerCase()!==intendedRecipient.toLowerCase(),replyTo:replyAlias},
    p_raw_payload:{resend:{id:resendPayload.id}}
  });
  if(messageError)return json({error:'MESSAGE_STORE_FAILED',details:messageError.message,providerReference:resendPayload.id,mailWasSent:true},500);
  let finalStatus=booking.status;
  if(['ready','needs_action'].includes(booking.status)){
    const {data:transitioned,error:transitionError}=await supabase.rpc('luvia_transition_booking',{p_booking_id:booking.id,p_status:'requested',p_patch:{provider:'resend',provider_reference:resendPayload.id,channel:'email',metadata:{last_mail_provider:'resend',last_mail_provider_reference:resendPayload.id}}});
    if(transitionError)return json({error:'BOOKING_TRANSITION_FAILED',details:transitionError.message,mailWasSent:true,messageWasStored:true},500);
    finalStatus=transitioned?.status||'requested';
  }
  return json({ok:true,provider:'resend',providerReference:resendPayload.id,channel:'email',status:finalStatus,mode,intendedRecipient,actualRecipient,replyTo:replyAlias,message:storedMessage});
 }catch(error){return json({error:'BOOKING_EMAIL_SEND_UNHANDLED',details:error instanceof Error?error.message:String(error)},500);}
});