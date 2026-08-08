(function(){
'use strict';
const VERSION='1.0.0';
const PROVIDER_ID='quandoo';
const clean=v=>String(v??'').trim();
const merchantRef=v=>/^\d+$/.test(clean(v))?clean(v):null;
const reservationRef=v=>clean(v)||null;
function capability(){return window.LuviaBookingProviderCapabilities?.get?.(PROVIDER_ID)||null;}
function access(){const c=capability();return Object.freeze({providerId:PROVIDER_ID,state:c?.luviaAccessState||'partner_required',connected:c?.luviaAccessState==='connected',availability:c?.platform?.availability===true,createReservation:c?.platform?.createReservation===true,statusWebhook:c?.platform?.statusWebhook===true,statusPolling:c?.platform?.statusPolling===true,attribution:c?.attribution||'click'});}
function normalizeVenueReference(v){return merchantRef(v);}
function normalizeReservationReference(v){return reservationRef(v);}
function mapProviderStatus(raw){
 const s=clean(raw).toUpperCase();
 const map={
  RESERVATION_CREATED:'requested',
  RESERVATION_CONFIRMED:'confirmed',
  RESERVATION_REJECTED:'declined',
  RESERVATION_EDITED:'needs_action',
  RESERVATION_CUSTOMER_CANCELED:'cancelled',
  RESERVATION_MERCHANT_CANCELED:'cancelled',
  RESERVATION_NOTIFICATION_REQUESTED:'needs_action',
  RESERVATION_NOTIFIED:'awaiting_reply',
  RESERVATION_RECONFIRMED:'confirmed',
  RESERVATION_CHECKED_OUT:'confirmed',
  RESERVATION_ENQUIRY_CREATED:'requested',
  RESERVATION_ENQUIRY_CONFIRMED:'confirmed',
  RESERVATION_ENQUIRY_REJECTED:'declined'
 };
 return map[s]||null;
}
function canApplyProviderStatus(raw){const target=mapProviderStatus(raw);return Boolean(target&&window.LuviaBookingStatusProvenance?.canAutoApply?.({capability:capability(),status:target,source:'provider_webhook'}));}
async function invoke(action,payload={}){
 await window.LuviaBooking?.init?.();
 const client=await window.LuviaSupabaseService.start();
 const {data,error}=await client.functions.invoke('booking-provider-quandoo',{body:{action,payload}});
 if(error){let detail=error.message||'Quandoo-Adapter nicht verfügbar.';try{const ctx=error.context;if(ctx&&typeof ctx.clone==='function'){const b=await ctx.clone().json();detail=b?.details||b?.message||b?.error||detail;}}catch{}throw new Error(String(detail));}
 if(data?.ok===false&&data?.expected===true)return data;
 if(data?.error)throw new Error(data.details||data.error);
 return data;
}
async function availability(input){return invoke('availability',input);}
async function createReservation(input){return invoke('create_reservation',input);}
async function diagnostics(){return invoke('diagnostics',{});}
function register(){const R=window.LuviaBookingProviderRegistry;if(!R)return null;const def={id:PROVIDER_ID,version:VERSION,channel:'api',priority:94,network:true,capability:capability(),supports:(booking,context={})=>{const a=access();const venue=normalizeVenueReference(context.quandooMerchantId||booking?.request?.quandooMerchantId||booking?.metadata?.providers?.quandoo?.merchantId);return {supported:Boolean(a.connected&&venue),score:a.connected&&venue?94:0,reason:a.connected&&venue?'Quandoo API verbunden':'Quandoo Partnerzugang noch nicht verbunden'};},dispatch:async(booking,context={})=>createReservation({bookingId:booking?.id,merchantId:context.quandooMerchantId||booking?.request?.quandooMerchantId||booking?.metadata?.providers?.quandoo?.merchantId})};try{return R.register(def,{replace:true});}catch(error){console.warn('[QuandooAdapter] Registry',error);return null;}}
const api=Object.freeze({version:VERSION,providerId:PROVIDER_ID,capability,access,normalizeVenueReference,normalizeReservationReference,mapProviderStatus,canApplyProviderStatus,availability,createReservation,diagnostics,register});
window.LuviaQuandooProviderAdapter=api;
if(window.LuviaBookingProviderRegistry)register();
})();
