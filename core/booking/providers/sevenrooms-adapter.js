(function(){
'use strict';
const VERSION='1.0.0';
const PROVIDER_ID='sevenrooms';
const clean=v=>String(v??'').trim();
const venueRef=v=>{const s=clean(v);return s&&/^[A-Za-z0-9._:-]{1,180}$/.test(s)?s:null;};
const reservationRef=v=>{const s=clean(v);return s&&/^[A-Za-z0-9._:-]{1,180}$/.test(s)?s:null;};
function capability(){return window.LuviaBookingProviderCapabilities?.get?.(PROVIDER_ID)||null;}
function access(){const c=capability();return Object.freeze({providerId:PROVIDER_ID,state:c?.luviaAccessState||'partner_required',connected:c?.luviaAccessState==='connected',availability:c?.platform?.availability===true,createReservation:c?.platform?.createReservation===true,statusWebhook:c?.platform?.statusWebhook===true,statusPolling:c?.platform?.statusPolling===true,attribution:c?.attribution||'none'});}
function normalizeVenueReference(v){return venueRef(v);}
function normalizeReservationReference(v){return reservationRef(v);}
/* SevenRooms publicly confirms a flexible/open API and restaurant booking/channel-management APIs,
   but the public surface does not expose a complete status vocabulary or callback contract.
   Until a verified partner contract exists, no provider status is guessed. */
function mapProviderStatus(){return null;}
function canApplyProviderStatus(){return false;}
async function invoke(action,payload={}){
 await window.LuviaBooking?.init?.();
 const client=await window.LuviaSupabaseService.start();
 const {data,error}=await client.functions.invoke('booking-provider-sevenrooms',{body:{action,payload}});
 if(error){let detail=error.message||'SevenRooms-Adapter nicht verfügbar.';try{const ctx=error.context;if(ctx&&typeof ctx.clone==='function'){const b=await ctx.clone().json();detail=b?.details||b?.message||b?.error||detail;}}catch{}throw new Error(String(detail));}
 if(data?.ok===false&&data?.expected===true)return data;
 if(data?.error)throw new Error(data.details||data.error);
 return data;
}
async function availability(input){return invoke('availability',input);}
async function createReservation(input){return invoke('create_reservation',input);}
async function getReservation(input){return invoke('get_reservation',input);}
async function cancelReservation(input){return invoke('cancel_reservation',input);}
async function diagnostics(){return invoke('diagnostics',{});}
function register(){
 const R=window.LuviaBookingProviderRegistry;if(!R)return null;
 const def={id:PROVIDER_ID,version:VERSION,channel:'api',priority:91,network:true,capability:capability(),supports:(booking,context={})=>{const a=access();const venue=normalizeVenueReference(context.sevenRoomsVenueId||context.sevenroomsVenueId||booking?.request?.sevenRoomsVenueId||booking?.metadata?.providers?.sevenrooms?.venueId);return{supported:Boolean(a.connected&&venue),score:a.connected&&venue?91:0,reason:a.connected&&venue?'SevenRooms Booking API verbunden':'SevenRooms Partnerzugang noch nicht verbunden'};},dispatch:async(booking,context={})=>createReservation({bookingId:booking?.id,venueReference:context.sevenRoomsVenueId||context.sevenroomsVenueId||booking?.request?.sevenRoomsVenueId||booking?.metadata?.providers?.sevenrooms?.venueId})};
 try{return R.register(def,{replace:true});}catch(error){console.warn('[SevenRoomsAdapter] Registry',error);return null;}
}
const api=Object.freeze({version:VERSION,providerId:PROVIDER_ID,capability,access,normalizeVenueReference,normalizeReservationReference,mapProviderStatus,canApplyProviderStatus,availability,createReservation,getReservation,cancelReservation,diagnostics,register});
window.LuviaSevenRoomsProviderAdapter=api;
if(window.LuviaBookingProviderRegistry)register();
})();
