(function(){
'use strict';
const VERSION='1.0.0';
const PROVIDER_ID='opentable';
const clean=v=>String(v??'').trim();
const rid=v=>/^\d{1,12}$/.test(clean(v))?clean(v):null;
const reservationRef=v=>{const s=clean(v);return s&&/^[A-Za-z0-9._:-]{1,160}$/.test(s)?s:null;};
function capability(){return window.LuviaBookingProviderCapabilities?.get?.(PROVIDER_ID)||null;}
function access(){const c=capability();return Object.freeze({providerId:PROVIDER_ID,state:c?.luviaAccessState||'partner_required',connected:c?.luviaAccessState==='connected',availability:c?.platform?.availability===true,createReservation:c?.platform?.createReservation===true,statusWebhook:c?.platform?.statusWebhook===true,statusPolling:c?.platform?.statusPolling===true,attribution:c?.attribution||'none'});}
function normalizeVenueReference(v){return rid(v);}
function normalizeReservationReference(v){return reservationRef(v);}
/* OpenTable's public partner material confirms booking/search APIs, but it does not publish a
   complete reservation-status vocabulary in the public overview. Keep the map intentionally
   conservative. Unknown values MUST remain null until the partner contract documents them. */
function mapProviderStatus(raw){
 const s=clean(raw).toLowerCase().replace(/[\s-]+/g,'_');
 const map={
  confirmed:'confirmed',booked:'confirmed',seated:'confirmed',completed:'confirmed',
  cancelled:'cancelled',canceled:'cancelled',
  declined:'declined',rejected:'declined',
  requested:'requested',created:'requested',pending:'awaiting_reply',
  needs_action:'needs_action',action_required:'needs_action'
 };
 return map[s]||null;
}
function canApplyProviderStatus(raw,source='provider_polling'){
 const target=mapProviderStatus(raw);
 return Boolean(target&&window.LuviaBookingStatusProvenance?.canAutoApply?.({capability:capability(),status:target,source}));
}
async function invoke(action,payload={}){
 await window.LuviaBooking?.init?.();
 const client=await window.LuviaSupabaseService.start();
 const {data,error}=await client.functions.invoke('booking-provider-opentable',{body:{action,payload}});
 if(error){
  let detail=error.message||'OpenTable-Adapter nicht verfügbar.';
  try{const ctx=error.context;if(ctx&&typeof ctx.clone==='function'){const b=await ctx.clone().json();detail=b?.details||b?.message||b?.error||detail;}}catch{}
  throw new Error(String(detail));
 }
 if(data?.ok===false&&data?.expected===true)return data;
 if(data?.error)throw new Error(data.details||data.error);
 return data;
}
async function directoryLookup(input){return invoke('directory_lookup',input);}
async function availability(input){return invoke('availability',input);}
async function createReservation(input){return invoke('create_reservation',input);}
async function getReservation(input){return invoke('get_reservation',input);}
async function cancelReservation(input){return invoke('cancel_reservation',input);}
async function diagnostics(){return invoke('diagnostics',{});}
function register(){
 const R=window.LuviaBookingProviderRegistry;if(!R)return null;
 const def={
  id:PROVIDER_ID,version:VERSION,channel:'api',priority:92,network:true,capability:capability(),
  supports:(booking,context={})=>{
   const a=access();
   const venue=normalizeVenueReference(context.openTableRid||context.opentableRid||booking?.request?.openTableRid||booking?.request?.opentableRid||booking?.metadata?.providers?.opentable?.rid);
   return {supported:Boolean(a.connected&&venue),score:a.connected&&venue?92:0,reason:a.connected&&venue?'OpenTable Consumer API verbunden':'OpenTable Partnerzugang noch nicht verbunden'};
  },
  dispatch:async(booking,context={})=>createReservation({bookingId:booking?.id,rid:context.openTableRid||context.opentableRid||booking?.request?.openTableRid||booking?.request?.opentableRid||booking?.metadata?.providers?.opentable?.rid})
 };
 try{return R.register(def,{replace:true});}catch(error){console.warn('[OpenTableAdapter] Registry',error);return null;}
}
const api=Object.freeze({version:VERSION,providerId:PROVIDER_ID,capability,access,normalizeVenueReference,normalizeReservationReference,mapProviderStatus,canApplyProviderStatus,directoryLookup,availability,createReservation,getReservation,cancelReservation,diagnostics,register});
window.LuviaOpenTableProviderAdapter=api;
if(window.LuviaBookingProviderRegistry)register();
})();
