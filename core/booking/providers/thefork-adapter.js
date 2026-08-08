(function(){
'use strict';
const VERSION='1.0.0';
const PROVIDER_ID='thefork';
const clean=v=>String(v??'').trim();
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(v))?clean(v):null;
function capability(){return window.LuviaBookingProviderCapabilities?.get?.(PROVIDER_ID)||null;}
function access(){const c=capability();return Object.freeze({providerId:PROVIDER_ID,state:c?.luviaAccessState||'partner_required',connected:c?.luviaAccessState==='connected',availability:c?.platform?.availability===true,createReservation:c?.platform?.createReservation===true,statusWebhook:c?.platform?.statusWebhook===true,statusPolling:c?.platform?.statusPolling===true});}
function normalizeVenueReference(v){return uuid(v);}
function normalizeReservationReference(v){return uuid(v)||clean(v)||null;}
/* Exact TheFork status vocabulary is intentionally not guessed. This map only accepts
   explicit, semantically unambiguous tokens and returns null for everything else. */
function mapProviderStatus(raw){const s=clean(raw).toLowerCase().replace(/[\s-]+/g,'_');const map={confirmed:'confirmed',cancelled:'cancelled',canceled:'cancelled',declined:'declined',rejected:'declined',requested:'requested',pending:'awaiting_reply'};return map[s]||null;}
function canApplyProviderStatus(raw){const target=mapProviderStatus(raw);return Boolean(target&&window.LuviaBookingStatusProvenance?.canAutoApply?.({capability:capability(),status:target,source:'provider_webhook'}));}
async function invoke(action,payload={}){await window.LuviaBooking?.init?.();const client=await window.LuviaSupabaseService.start();const {data,error}=await client.functions.invoke('booking-provider-thefork',{body:{action,payload}});if(error){let detail=error.message||'TheFork-Adapter nicht verfügbar.';try{const ctx=error.context;if(ctx&&typeof ctx.json==='function'){const b=await ctx.json();detail=b?.details||b?.message||b?.error||detail;}}catch{}throw new Error(String(detail));}if(data?.error)throw new Error(data.details||data.error);return data;}
async function availability(input){return invoke('availability',input);}
async function createReservation(input){return invoke('create_reservation',input);}
async function diagnostics(){return invoke('diagnostics',{});}
function register(){const R=window.LuviaBookingProviderRegistry;if(!R)return null;const def={id:PROVIDER_ID,version:VERSION,channel:'api',priority:95,network:true,capability:capability(),supports:(booking,context={})=>{const a=access();const venue=normalizeVenueReference(context.theforkRestaurantId||booking?.request?.theforkRestaurantId||booking?.metadata?.providers?.thefork?.restaurantId);return {supported:Boolean(a.connected&&venue),score:a.connected&&venue?95:0,reason:a.connected&&venue?'TheFork API verbunden':'TheFork Partnerzugang noch nicht verbunden'};},dispatch:async(booking,context={})=>createReservation({bookingId:booking?.id,restaurantId:context.theforkRestaurantId||booking?.request?.theforkRestaurantId||booking?.metadata?.providers?.thefork?.restaurantId})};try{return R.register(def,{replace:true});}catch(error){console.warn('[TheForkAdapter] Registry',error);return null;}}
const api=Object.freeze({version:VERSION,providerId:PROVIDER_ID,capability,access,normalizeVenueReference,normalizeReservationReference,mapProviderStatus,canApplyProviderStatus,availability,createReservation,diagnostics,register});
window.LuviaTheForkProviderAdapter=api;
if(window.LuviaBookingProviderRegistry)register();
})();
