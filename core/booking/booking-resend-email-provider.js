(function(){
'use strict';
const VERSION='0.3.0';
const clean=v=>String(v??'').trim();
function create(options={}){
 const cfg={functionUrl:clean(options.functionUrl),anonKey:clean(options.anonKey),providerId:'resend-email'};
 return Object.freeze({
  id:cfg.providerId,version:VERSION,channel:'email',priority:70,network:true,
  supports:booking=>({supported:Boolean(booking?.contact?.email),score:70,reason:'Kontakt-E-Mail vorhanden; Versand via Supabase Edge Function + Resend'}),
  async dispatch(booking,context={}){
   if(!cfg.functionUrl)throw new Error('booking-email-send Function URL fehlt.');
   const token=context.accessToken||window?.LuviaSupabaseClient?.authToken||'';
   const response=await fetch(cfg.functionUrl,{method:'POST',headers:{'Content-Type':'application/json',...(cfg.anonKey?{apikey:cfg.anonKey}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({bookingId:booking.id,mode:context.mode||'test',testRecipient:context.testRecipient||null,sender:context.sender||null,requesterName:context.requesterName||null,note:context.note||null,idempotencyKey:context.idempotencyKey||null})});
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(payload?.error||payload?.message||`Resend transport failed (${response.status})`);
   return payload;
  }
 });
}
function register(options={}){const p=create(options);window.LuviaBookingProviderRegistry?.register(p,{replace:true});return p;}
window.LuviaBookingResendEmailProvider=Object.freeze({version:VERSION,create,register});
})();
