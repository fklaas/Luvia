(function(){
'use strict';
const VERSION='0.3.0';let repository=null;let config={mode:'test',testRecipient:'',sender:'Luvia Booking Test <booking-test@luvia.invalid>'};
const CC=()=>window.LuviaBookingCommunicationContract;const E=()=>window.LuviaBookingEvents;const P=()=>window.LuviaBookingProviderRegistry;
function configure(options={}){repository=options.repository||repository;config={...config,...options};return api;}
function repo(){if(!repository)throw new Error('BookingCommunication Repository ist nicht konfiguriert.');return repository;}
function dbMessage(bookingId,m){return {booking_id:bookingId,direction:m.direction,channel:m.channel,transport_provider:m.transportProvider||null,sender:m.sender||null,recipient:m.recipient||null,intended_recipient:m.intendedRecipient||null,actual_recipient:m.actualRecipient||null,subject:m.subject||null,body_text:m.bodyText||null,template_key:m.templateKey||null,provider_message_id:m.providerMessageId||null,provider_thread_id:m.providerThreadId||null,delivery_status:m.deliveryStatus||'queued',idempotency_key:m.idempotencyKey||null,raw_payload:m.rawPayload||{},metadata:m.metadata||{},sent_at:m.deliveryStatus==='sent'?new Date().toISOString():null,received_at:m.direction==='inbound'?new Date().toISOString():null};}
async function send(booking,options={}){
 const mode=CC().mode(options.mode||config.mode);const idempotencyKey=options.idempotencyKey||`booking:${booking.id}:request:${booking.status}`;
 const existing=await repo().findMessageByIdempotency?.(idempotencyKey);if(existing)return {deduplicated:true,message:existing,status:booking.status,provider:existing.transport_provider};
 const composed=CC().compose(booking,options);
 const result=await P().dispatch(booking,{...options,providerId:options.providerId||'mock-email',mode,testRecipient:options.testRecipient||config.testRecipient,sender:options.sender||config.sender,composed,idempotencyKey});
 if(!result?.message)throw new Error('Booking-Provider hat keine Kommunikationsnachricht geliefert.');
 const normalized=CC().normalizeMessage(result.message);const stored=await repo().addMessage(dbMessage(booking.id,normalized));
 await E().emit(E().names.MESSAGE_SENT,{bookingId:booking.id,message:stored,provider:result.provider});
 return {...result,message:stored};
}
async function receive(bookingId,input={}){
 const m=CC().normalizeMessage({...input,bookingId,direction:'inbound',deliveryStatus:'received'});const stored=await repo().addMessage(dbMessage(bookingId,m));
 await E().emit(E().names.MESSAGE_RECEIVED,{bookingId,message:stored});return stored;
}
const api=Object.freeze({version:VERSION,configure,send,receive,compose:(b,o)=>CC().compose(b,o)});window.LuviaBookingCommunication=api;
})();
