(function(){
'use strict';
const VERSION='1.0.0';
const PROVIDER_ID='zenchef';
const clean=v=>String(v??'').trim();
const providerRef=v=>{const s=clean(v);return s&&/^[A-Za-z0-9._:-]{1,160}$/.test(s)?s:null;};
function capability(){return window.LuviaBookingProviderCapabilities?.get?.(PROVIDER_ID)||null;}
function access(){const c=capability();return Object.freeze({providerId:PROVIDER_ID,state:c?.luviaAccessState||'partner_required',connected:c?.luviaAccessState==='connected',availability:c?.platform?.availability===true,createReservation:c?.platform?.createReservation===true,statusWebhook:c?.platform?.statusWebhook===true,statusPolling:c?.platform?.statusPolling===true,attribution:c?.attribution||'none'});}
function normalizeVenueReference(v){return providerRef(v);}
function normalizeReservationReference(v){return providerRef(v);}
/* Public Zenchef material confirms reservation create/update and reservation-update webhooks,
   but does not publish the complete status vocabulary. Only explicit, semantically safe tokens
   are accepted here. Unknown provider values deliberately map to null. */
function mapProviderStatus(raw){
 const s=clean(raw).toLowerCase().replace(/[\s-]+/g,'_');
 const map={
  confirmed:'confirmed',accepted:'confirmed',
  cancelled:'cancelled',canceled:'cancelled',
  declined:'declined',rejected:'declined',refused:'declined',
  requested:'requested',created:'requested',
  pending:'awaiting_reply',waiting:'awaiting_reply',
  alternative_proposed:'alternative_proposed',needs_action:'needs_action'
 };
 return map[s]||null;
}
function canApplyProviderStatus(raw,source='provider_webhook'){
 const target=mapProviderStatus(raw);
 return Boolean(target&&window.LuviaBookingStatusProvenance?.canAutoApply?.({capability:capability(),status:target,source}));
}
async function invoke(action,payload={}){
 await window.LuviaBooking?.init?.();
 const client=await window.LuviaSupabaseService.start();
 const {data,error}=await client.functions.invoke('booking-provider-zenchef',{body:{action,payload}});
 if(error){
  let detail=error.message||'Zenchef-Adapter nicht verfügbar.';
  try{const ctx=error.context;if(ctx&&typeof ctx.clone==='function'){const b=await ctx.clone().json();detail=b?.details||b?.message||b?.error||detail;}}catch{}
  throw new Error(String(detail));
 }
 if(data?.ok===false&&data?.expected===true)return data;
 if(data?.error)throw new Error(data.details||data.error);
 return data;
}
async function availability(input){return invoke('availability',input);}
async function createReservation(input){return invoke('create_reservation',input);}
async function updateReservation(input){return invoke('update_reservation',input);}
async function diagnostics(){return invoke('diagnostics',{});}
function register(){
 const R=window.LuviaBookingProviderRegistry;if(!R)return null;
 const def={
  id:PROVIDER_ID,version:VERSION,channel:'api',priority:93,network:true,capability:capability(),
  supports:(booking,context={})=>{
   const a=access();
   const venue=normalizeVenueReference(context.zenchefRestaurantId||booking?.request?.zenchefRestaurantId||booking?.metadata?.providers?.zenchef?.restaurantId);
   return {supported:Boolean(a.connected&&venue),score:a.connected&&venue?93:0,reason:a.connected&&venue?'Zenchef API verbunden':'Zenchef Partnerzugang noch nicht verbunden'};
  },
  dispatch:async(booking,context={})=>createReservation({bookingId:booking?.id,restaurantId:context.zenchefRestaurantId||booking?.request?.zenchefRestaurantId||booking?.metadata?.providers?.zenchef?.restaurantId})
 };
 try{return R.register(def,{replace:true});}catch(error){console.warn('[ZenchefAdapter] Registry',error);return null;}
}
const api=Object.freeze({version:VERSION,providerId:PROVIDER_ID,capability,access,normalizeVenueReference,normalizeReservationReference,mapProviderStatus,canApplyProviderStatus,availability,createReservation,updateReservation,diagnostics,register});
window.LuviaZenchefProviderAdapter=api;
if(window.LuviaBookingProviderRegistry)register();
})();
