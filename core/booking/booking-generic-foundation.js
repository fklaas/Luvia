(function(){
'use strict';
const VERSION='0.6.0';
const TYPES=Object.freeze(['restaurant','hotel','activity','event','transport','rental','other']);
const OFFER_STATUSES=Object.freeze(['received','selected','rejected','expired','superseded']);
const clean=v=>String(v??'').trim();
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const int=(v,fallback=0)=>{const n=finite(v);return n===null?fallback:Math.max(0,Math.round(n));};
const iso=v=>{if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();};
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const arr=v=>Array.isArray(v)?v:[];
function nights(startAt,endAt){const a=iso(startAt),b=iso(endAt);if(!a||!b)return null;const ms=new Date(b)-new Date(a);if(ms<=0)return null;return Math.ceil(ms/86400000);}
function normalizeGuests(raw={}){
 const g=obj(raw);
 return Object.freeze({
  adults:Math.max(0,int(g.adults,0)),
  children:Math.max(0,int(g.children,0)),
  infants:Math.max(0,int(g.infants,0)),
  pets:Math.max(0,int(g.pets,0)),
  childAges:Object.freeze(arr(g.childAges||g.child_ages).map(x=>int(x,0)).filter(x=>x>=0&&x<=17))
 });
}
function normalizeDetails(type,raw={},booking={}){
 const t=TYPES.includes(clean(type).toLowerCase())?clean(type).toLowerCase():'other';
 const d=obj(raw);
 if(t==='hotel')return Object.freeze({
  rooms:Math.max(1,int(d.rooms,1)),
  roomType:clean(d.roomType||d.room_type)||null,
  board:clean(d.board)||null,
  flexibleDates:Boolean(d.flexibleDates??d.flexible_dates),
  nights:nights(booking.startAt||booking.start_at,d.checkoutAt||d.checkout_at||booking.endAt||booking.end_at),
  accessibility:Object.freeze(obj(d.accessibility)),
  amenities:Object.freeze(arr(d.amenities).map(clean).filter(Boolean))
 });
 if(t==='restaurant')return Object.freeze({
  seating:clean(d.seating)||null,
  occasion:clean(d.occasion)||null,
  dietary:Object.freeze(arr(d.dietary).map(clean).filter(Boolean)),
  highChair:Boolean(d.highChair??d.high_chair)
 });
 if(t==='transport')return Object.freeze({
  origin:clean(d.origin)||null,
  destination:clean(d.destination)||null,
  returnAt:iso(d.returnAt||d.return_at),
  travelClass:clean(d.travelClass||d.travel_class)||null,
  luggage:Object.freeze(obj(d.luggage))
 });
 if(t==='rental')return Object.freeze({
  pickupLocation:clean(d.pickupLocation||d.pickup_location)||null,
  dropoffLocation:clean(d.dropoffLocation||d.dropoff_location)||null,
  pickupAt:iso(d.pickupAt||d.pickup_at||booking.startAt||booking.start_at),
  dropoffAt:iso(d.dropoffAt||d.dropoff_at||booking.endAt||booking.end_at),
  category:clean(d.category)||null
 });
 if(t==='activity'||t==='event')return Object.freeze({
  durationMinutes:finite(d.durationMinutes||d.duration_minutes),
  ticketCategory:clean(d.ticketCategory||d.ticket_category)||null,
  accessibility:Object.freeze(obj(d.accessibility)),
  language:clean(d.language)||null
 });
 return Object.freeze({...d});
}
function validateProfile(raw={}){
 const type=TYPES.includes(clean(raw.type||raw.bookingType||raw.booking_type).toLowerCase())?clean(raw.type||raw.bookingType||raw.booking_type).toLowerCase():'other';
 const booking=obj(raw.booking); const guests=normalizeGuests(raw.guests); const details=normalizeDetails(type,raw.details,booking); const errors=[];
 const partySize=Math.max(1,int(booking.partySize||booking.party_size,1));
 const guestCount=guests.adults+guests.children+guests.infants;
 if(guestCount>0&&guestCount!==partySize)errors.push('GUEST_COUNT_MISMATCH');
 if(type==='hotel'){
  if(!iso(booking.startAt||booking.start_at))errors.push('HOTEL_CHECKIN_REQUIRED');
  if(!iso(booking.endAt||booking.end_at))errors.push('HOTEL_CHECKOUT_REQUIRED');
  if(iso(booking.startAt||booking.start_at)&&iso(booking.endAt||booking.end_at)&&!nights(booking.startAt||booking.start_at,booking.endAt||booking.end_at))errors.push('HOTEL_DATE_RANGE_INVALID');
  if(guests.adults<1)errors.push('HOTEL_ADULT_REQUIRED');
 }
 if(type==='transport'){
  if(!details.origin)errors.push('TRANSPORT_ORIGIN_REQUIRED');
  if(!details.destination)errors.push('TRANSPORT_DESTINATION_REQUIRED');
 }
 if(type==='rental'){
  if(!details.pickupLocation)errors.push('RENTAL_PICKUP_LOCATION_REQUIRED');
  if(!details.dropoffLocation)errors.push('RENTAL_DROPOFF_LOCATION_REQUIRED');
 }
 return Object.freeze({valid:errors.length===0,errors:Object.freeze(errors),type,details,guests});
}
function normalizeOffer(raw={}){
 const status=OFFER_STATUSES.includes(clean(raw.status).toLowerCase())?clean(raw.status).toLowerCase():'received';
 const amount=finite(raw.amount);
 return Object.freeze({
  id:clean(raw.id)||null,
  status,
  provider:clean(raw.provider)||null,
  channel:clean(raw.channel)||'manual',
  amount:amount===null?null:Math.max(0,amount),
  currency:(clean(raw.currency)||'EUR').toUpperCase().slice(0,3),
  validUntil:iso(raw.validUntil||raw.valid_until),
  externalUrl:clean(raw.externalUrl||raw.external_url)||null,
  externalReference:clean(raw.externalReference||raw.external_reference)||null,
  summary:clean(raw.summary)||null,
  terms:Object.freeze(obj(raw.terms)),
  cancellation:Object.freeze(obj(raw.cancellation)),
  components:Object.freeze(arr(raw.components).map(x=>Object.freeze({...obj(x)}))),
  metadata:Object.freeze(obj(raw.metadata))
 });
}
window.LuviaBookingGenericFoundation=Object.freeze({version:VERSION,TYPES,OFFER_STATUSES,nights,normalizeGuests,normalizeDetails,validateProfile,normalizeOffer});
})();
