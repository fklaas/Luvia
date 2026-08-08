(function(){
'use strict';
const VERSION='1.0.0';
const PROVIDER_ID='tock';
const clean=v=>String(v??'').trim();
const businessRef=v=>{const s=clean(v);return s&&/^[A-Za-z0-9._:-]{1,180}$/.test(s)?s:null;};
const reservationRef=v=>{const s=clean(v);return s&&/^[A-Za-z0-9._:-]{1,180}$/.test(s)?s:null;};
function capability(){return window.LuviaBookingProviderCapabilities?.get?.(PROVIDER_ID)||null;}
function access(){const c=capability();return Object.freeze({providerId:PROVIDER_ID,state:c?.luviaAccessState||'partner_required',connected:c?.luviaAccessState==='connected',availability:c?.platform?.availability===true,createReservation:c?.platform?.createReservation===true,statusWebhook:c?.platform?.statusWebhook===true,statusPolling:c?.platform?.statusPolling===true,attribution:c?.attribution||'none'});}
function normalizeVenueReference(v){return businessRef(v);}
function normalizeReservationReference(v){return reservationRef(v);}
/* Tock publicly documents reservation records including stable reservation IDs,
   confirmationCode, sequenceId, lastUpdatedTimestamp, isCancelled and partyState.
   These fields provide a verified future polling/status seam. Public documentation
   reviewed for this foundation does not establish a general third-party guest
   availability/create-reservation contract or webhook contract, so Luvia does not
   claim those capabilities and does not guess undocumented transport/auth details. */
function mapProviderStatus(status,{isCancelled=false}={}){
 if(isCancelled===true)return 'cancelled';
 const s=clean(status).toUpperCase();
 if(s==='CANCELLED')return 'cancelled';
 if(s==='EXPECTED')return 'confirmed';
 if(['ARRIVED','SEATED','LEFT','PARTIALLY_ARRIVED','PARTIALLY_SEATED'].includes(s))return 'confirmed';
 if(s==='NO_SHOW')return 'action_required';
 return null;
}
function canApplyProviderStatus(status,context={}){return Boolean(mapProviderStatus(status,context));}
async function invoke(action,payload={}){
 await window.LuviaBooking?.init?.();
 const client=await window.LuviaSupabaseService.start();
 const {data,error}=await client.functions.invoke('booking-provider-tock',{body:{action,payload}});
 if(error){let detail=error.message||'Tock-Adapter nicht verfügbar.';try{const ctx=error.context;if(ctx&&typeof ctx.clone==='function'){const b=await ctx.clone().json();detail=b?.details||b?.message||b?.error||detail;}}catch{}throw new Error(String(detail));}
 if(data?.ok===false&&data?.expected===true)return data;
 if(data?.error)throw new Error(data.details||data.error);
 return data;
}
async function getReservation(input){return invoke('get_reservation',input);}
async function pollStatus(input){return invoke('poll_status',input);}
async function diagnostics(){return invoke('diagnostics',{});}
function register(){
 const R=window.LuviaBookingProviderRegistry;if(!R)return null;
 const def={id:PROVIDER_ID,version:VERSION,channel:'api',priority:86,network:true,capability:capability(),supports:(booking,context={})=>{const a=access();const venue=normalizeVenueReference(context.tockBusinessId||context.tockVenueReference||booking?.request?.tockBusinessId||booking?.metadata?.providers?.tock?.businessId);const reservation=normalizeReservationReference(context.tockReservationId||booking?.metadata?.providers?.tock?.reservationId);return{supported:Boolean(a.connected&&venue&&reservation&&a.statusPolling),score:a.connected&&venue&&reservation&&a.statusPolling?86:0,reason:a.connected&&venue&&reservation&&a.statusPolling?'Tock Status-Polling verbunden':'Tock Partnerzugang noch nicht verbunden'};},dispatch:async(booking,context={})=>pollStatus({bookingId:booking?.id,businessReference:context.tockBusinessId||context.tockVenueReference||booking?.request?.tockBusinessId||booking?.metadata?.providers?.tock?.businessId,reservationReference:context.tockReservationId||booking?.metadata?.providers?.tock?.reservationId})};
 try{return R.register(def,{replace:true});}catch(error){console.warn('[TockAdapter] Registry',error);return null;}
}
const api=Object.freeze({version:VERSION,providerId:PROVIDER_ID,capability,access,normalizeVenueReference,normalizeReservationReference,mapProviderStatus,canApplyProviderStatus,getReservation,pollStatus,diagnostics,register});
window.LuviaTockProviderAdapter=api;
if(window.LuviaBookingProviderRegistry)register();
})();
