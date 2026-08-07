(function(){
'use strict';
const VERSION='0.4.0';
const MODES=Object.freeze(['test','staging','production']);
const DIRECTIONS=Object.freeze(['outbound','inbound','system']);
const DELIVERY_STATUSES=Object.freeze(['queued','sent','delivered','received','failed']);
const clean=v=>String(v??'').trim();
const mode=v=>MODES.includes(clean(v).toLowerCase())?clean(v).toLowerCase():'test';
const formatDateTime=(value,locale='de-DE')=>{
 if(!value)return {date:'',time:''};
 const d=new Date(value);if(Number.isNaN(d.getTime()))return {date:'',time:''};
 return {date:new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Berlin'}).format(d),time:new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(d)};
};
function compose(booking,options={}){
 const b=window.LuviaBookingContract?.normalize?window.LuviaBookingContract.normalize(booking):booking;
 const locale=options.locale||'de-DE';const dt=formatDateTime(b.startAt||b.start_at,locale);
 const name=clean(options.requesterName||b.request?.requesterName||'Luvia Reisender');
 const note=clean(options.note||b.request?.note||b.request?.specialRequest);
 const party=Number(b.partySize||b.party_size||1);
 const subject=clean(options.subject)||`Buchungsanfrage · ${b.title}`;
 let intro='ich möchte gerne eine Buchung anfragen.';
 if(b.type==='restaurant')intro='ich möchte gerne einen Tisch in Ihrem Restaurant reservieren.';
 if(b.type==='hotel')intro='ich möchte gerne die Verfügbarkeit für einen Aufenthalt anfragen.';
 const lines=['Guten Tag,','',intro,'',`Datum: ${dt.date||'noch offen'}`];
 if(dt.time)lines.push(`Uhrzeit: ${dt.time}`);
 if(b.type==='hotel'&&b.endAt){const end=formatDateTime(b.endAt,locale);lines.push(`Abreise: ${end.date}`);}
 lines.push(`Personen: ${party}`,`Name: ${name}`);
 if(note)lines.push('',`Hinweis: ${note}`);
 lines.push('','Bitte bestätigen Sie uns kurz, ob die Buchung möglich ist.','','Vielen Dank und freundliche Grüße','',name,'Buchungsanfrage über Luvia');
 return Object.freeze({templateKey:`${b.type||'other'}.request.de.v1`,subject,bodyText:lines.join('\n')});
}
function routeRecipient({mode:rawMode,intendedRecipient,testRecipient}){
 const current=mode(rawMode);const intended=clean(intendedRecipient);const test=clean(testRecipient);
 if(!intended)throw new Error('Empfängeradresse fehlt.');
 if(current==='production')return {mode:current,intendedRecipient:intended,actualRecipient:intended,redirected:false};
 if(!test)throw new Error(`BOOKING_TEST_RECIPIENT fehlt für ${current}-Modus.`);
 return {mode:current,intendedRecipient:intended,actualRecipient:test,redirected:intended.toLowerCase()!==test.toLowerCase()};
}
function normalizeMessage(raw={}){
 return Object.freeze({
  id:clean(raw.id)||null, bookingId:clean(raw.bookingId||raw.booking_id)||null,
  direction:DIRECTIONS.includes(clean(raw.direction).toLowerCase())?clean(raw.direction).toLowerCase():'outbound',
  channel:clean(raw.channel)||'email', transportProvider:clean(raw.transportProvider||raw.transport_provider)||null,
  sender:clean(raw.sender)||null, recipient:clean(raw.recipient)||null,
  intendedRecipient:clean(raw.intendedRecipient||raw.intended_recipient)||null, actualRecipient:clean(raw.actualRecipient||raw.actual_recipient)||null,
  subject:clean(raw.subject), bodyText:String(raw.bodyText??raw.body_text??''), templateKey:clean(raw.templateKey||raw.template_key)||null,
  providerMessageId:clean(raw.providerMessageId||raw.provider_message_id)||null, providerThreadId:clean(raw.providerThreadId||raw.provider_thread_id)||null,
  deliveryStatus:DELIVERY_STATUSES.includes(clean(raw.deliveryStatus||raw.delivery_status).toLowerCase())?clean(raw.deliveryStatus||raw.delivery_status).toLowerCase():'queued',
  idempotencyKey:clean(raw.idempotencyKey||raw.idempotency_key)||null,
  metadata:Object.freeze({...raw.metadata}), rawPayload:Object.freeze({...raw.rawPayload,...raw.raw_payload})
 });
}
window.LuviaBookingCommunicationContract=Object.freeze({version:VERSION,MODES,DIRECTIONS,DELIVERY_STATUSES,mode,compose,routeRecipient,normalizeMessage});
})();
