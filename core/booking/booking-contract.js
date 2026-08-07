(function(){
'use strict';
const VERSION='0.6.0';
const TYPES=Object.freeze(['restaurant','hotel','activity','event','transport','rental','other']);
const STATUSES=Object.freeze(['draft','ready','requested','awaiting_reply','needs_action','confirmed','declined','cancelled','failed']);
const CHANNELS=Object.freeze(['email','api','affiliate','external_link','manual']);
const TRANSITIONS=Object.freeze({
  draft:['ready','cancelled'],
  ready:['requested','cancelled','failed'],
  requested:['awaiting_reply','confirmed','declined','needs_action','cancelled','failed'],
  awaiting_reply:['confirmed','declined','needs_action','cancelled','failed'],
  needs_action:['requested','awaiting_reply','confirmed','declined','cancelled','failed'],
  confirmed:['cancelled','needs_action'],
  declined:['ready','cancelled'],
  failed:['ready','cancelled'],
  cancelled:[]
});
const clean=v=>String(v??'').trim();
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const iso=v=>{if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();};
const uniq=a=>[...new Set((Array.isArray(a)?a:[]).map(clean).filter(Boolean))];
function status(value='draft'){const v=clean(value).toLowerCase();return STATUSES.includes(v)?v:'draft';}
function type(value='other'){const v=clean(value).toLowerCase();return TYPES.includes(v)?v:'other';}
function channel(value='manual'){const v=clean(value).toLowerCase();return CHANNELS.includes(v)?v:'manual';}
function canTransition(from,to){const a=status(from),b=status(to);return a===b||Boolean(TRANSITIONS[a]?.includes(b));}
function assertTransition(from,to){if(!canTransition(from,to))throw new Error(`Ungültiger Booking-Statuswechsel: ${from} → ${to}`);return true;}
function normalize(raw={},defaults={}){
  const now=new Date().toISOString();
  return Object.freeze({
    id:clean(raw.id)||null,
    tripId:clean(raw.tripId||raw.trip_id||defaults.tripId)||null,
    tripPlaceId:clean(raw.tripPlaceId||raw.trip_place_id||defaults.tripPlaceId)||null,
    placeId:clean(raw.placeId||raw.place_id||defaults.placeId)||null,
    requestedBy:clean(raw.requestedBy||raw.requested_by||defaults.requestedBy)||null,
    type:type(raw.type||raw.booking_type||defaults.type),
    status:status(raw.status||defaults.status),
    channel:channel(raw.channel||defaults.channel),
    provider:clean(raw.provider||defaults.provider)||null,
    providerReference:clean(raw.providerReference||raw.provider_reference)||null,
    title:clean(raw.title||defaults.title)||'Buchung',
    startAt:iso(raw.startAt||raw.start_at||raw.dateTime||defaults.startAt),
    endAt:iso(raw.endAt||raw.end_at||defaults.endAt),
    partySize:Math.max(1,Math.round(finite(raw.partySize||raw.party_size||defaults.partySize)||1)),
    participantIds:Object.freeze(uniq(raw.participantIds||raw.participant_ids||defaults.participantIds)),
    currency:(clean(raw.currency||defaults.currency)||'EUR').toUpperCase().slice(0,3),
    amount:finite(raw.amount),
    confirmationNumber:clean(raw.confirmationNumber||raw.confirmation_number)||null,
    cancellationDeadline:iso(raw.cancellationDeadline||raw.cancellation_deadline),
    contact:Object.freeze({...defaults.contact,...(raw.contact||{})}),
    request:Object.freeze({...defaults.request,...(raw.request||{})}),
    metadata:Object.freeze({...defaults.metadata,...(raw.metadata||{})}),
    createdAt:iso(raw.createdAt||raw.created_at)||now,
    updatedAt:iso(raw.updatedAt||raw.updated_at)||now
  });
}
function validate(value,{requireTrip=true}={}){
  const b=normalize(value);const errors=[];
  if(requireTrip&&!b.tripId)errors.push('tripId');
  if(!TYPES.includes(b.type))errors.push('type');
  if(!STATUSES.includes(b.status))errors.push('status');
  if(!CHANNELS.includes(b.channel))errors.push('channel');
  if(!b.title)errors.push('title');
  return {valid:errors.length===0,errors,booking:b};
}
window.LuviaBookingContract=Object.freeze({version:VERSION,TYPES,STATUSES,CHANNELS,TRANSITIONS,type,status,channel,normalize,validate,canTransition,assertTransition});
})();
